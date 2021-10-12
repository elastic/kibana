/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, mergeMap, timeout } from 'rxjs/operators';
import { durationToNumber, numberToDuration } from '../../../common/schema_utils';
import { UrlOrUrlLocatorTuple } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import { getChromiumDisconnectedError } from '../../browsers/chromium';
import { CaptureConfig } from '../../types';
import { PageSetupResults, ScreenshotObservableOpts, ScreenshotResults } from './';
import { DEFAULT_PAGELOAD_SELECTOR } from './constants';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getNumberOfItems } from './get_number_of_items';
import { getScreenshots } from './get_screenshots';
import { getTimeRange } from './get_time_range';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import { waitForRenderComplete } from './wait_for_render';
import { waitForVisualizations } from './wait_for_visualizations';

interface PhaseInstance {
  timeoutValue: moment.Duration | number;
  configValue: string;
  label: string;
}

export class ScreenshotObservableHandler {
  private conditionalHeaders: ScreenshotObservableOpts['conditionalHeaders'];
  private layout: ScreenshotObservableOpts['layout'];
  private logger: ScreenshotObservableOpts['logger'];
  private waitErrorRegistered = false;

  public readonly OPEN_URL: PhaseInstance = {
    timeoutValue: this.captureConfig.timeouts.openUrl,
    configValue: `xpack.reporting.capture.timeouts.openUrl`,
    label: 'open URL',
  };
  public readonly WAIT_FOR_ELEMENTS: PhaseInstance = {
    timeoutValue: this.captureConfig.timeouts.waitForElements,
    configValue: `xpack.reporting.capture.timeouts.waitForElements`,
    label: 'wait for elements',
  };
  public readonly RENDER_COMPLETE: PhaseInstance = {
    timeoutValue: this.captureConfig.timeouts.renderComplete,
    configValue: `xpack.reporting.capture.timeouts.renderComplete`,
    label: 'render complete',
  };

  constructor(
    private readonly driver: HeadlessChromiumDriver,
    private readonly captureConfig: CaptureConfig,
    opts: ScreenshotObservableOpts
  ) {
    this.conditionalHeaders = opts.conditionalHeaders;
    this.layout = opts.layout;
    this.logger = opts.logger;
  }

  /*
   * This wraps a chain of observable operators in a timeout, and decorates a
   * timeout error to specify which phase of page capture has timed out.
   */
  public waitUntil<O, P>(phase: PhaseInstance, chain: Rx.OperatorFunction<O, P>) {
    const { timeoutValue, label, configValue } = phase;
    return (o: Rx.Observable<O>) => {
      return o.pipe(
        chain,
        timeout(durationToNumber(timeoutValue)),
        catchError((error: string | Error) => {
          if (this.waitErrorRegistered) {
            throw error; // do not create a stack of errors within the error
          }

          this.logger.error(error);
          let throwError = new Error(`The "${label}" phase encountered an error: ${error}`);

          if (error instanceof Rx.TimeoutError) {
            throwError = new Error(
              `The "${label}" phase took longer than ` +
                `${numberToDuration(timeoutValue).asSeconds()}.` +
                `You may need to increase "${configValue}": ${error}`
            );
          }

          this.waitErrorRegistered = true;
          this.logger.error(throwError);
          throw throwError;
        })
      );
    };
  }

  public openUrl(index: number, urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple) {
    return (initial: Rx.Observable<unknown>) => {
      return initial.pipe(
        mergeMap(() => {
          // If we're moving to another page in the app, we'll want to wait for the app to tell us
          // it's loaded the next page.
          const page = index + 1;
          const pageLoadSelector =
            page > 1 ? `[data-shared-page="${page}"]` : DEFAULT_PAGELOAD_SELECTOR;

          return openUrl(
            this.captureConfig,
            this.driver,
            urlOrUrlLocatorTuple,
            pageLoadSelector,
            this.conditionalHeaders,
            this.logger
          );
        })
      );
    };
  }

  public waitForElements() {
    const driver = this.driver;
    return (withPageOpen: Rx.Observable<void>) => {
      return withPageOpen.pipe(
        mergeMap(() => getNumberOfItems(this.captureConfig, driver, this.layout, this.logger)),
        mergeMap(async (itemsCount) => {
          // set the viewport to the dimentions from the job, to allow elements to flow into the expected layout
          const viewport = this.layout.getViewport(itemsCount) || getDefaultViewPort();
          await Promise.all([
            driver.setViewport(viewport, this.logger),
            waitForVisualizations(this.captureConfig, driver, itemsCount, this.layout, this.logger),
          ]);
        })
      );
    };
  }

  public completeRender(apmTrans: apm.Transaction | null) {
    const driver = this.driver;
    return (withElements: Rx.Observable<void>) => {
      return withElements.pipe(
        mergeMap(async () => {
          // Waiting till _after_ elements have rendered before injecting our CSS
          // allows for them to be displayed properly in many cases
          await injectCustomCss(driver, this.layout, this.logger);

          const apmPositionElements = apmTrans?.startSpan('position_elements', 'correction');
          if (this.layout.positionElements) {
            // position panel elements for print layout
            await this.layout.positionElements(driver, this.logger);
          }
          if (apmPositionElements) apmPositionElements.end();

          await waitForRenderComplete(this.captureConfig, driver, this.layout, this.logger);
        }),
        mergeMap(async () => {
          return await Promise.all([
            getTimeRange(driver, this.layout, this.logger),
            getElementPositionAndAttributes(driver, this.layout, this.logger),
          ]).then(([timeRange, elementsPositionAndAttributes]) => ({
            elementsPositionAndAttributes,
            timeRange,
          }));
        })
      );
    };
  }

  public getScreenshots() {
    return (withRenderComplete: Rx.Observable<PageSetupResults>) => {
      return withRenderComplete.pipe(
        mergeMap(async (data: PageSetupResults): Promise<ScreenshotResults> => {
          this.checkPageIsOpen(); // fail the report job if the browser has closed

          const elements = data.elementsPositionAndAttributes
            ? data.elementsPositionAndAttributes
            : getDefaultElementPosition(this.layout.getViewport(1));
          const screenshots = await getScreenshots(this.driver, elements, this.logger);
          const { timeRange, error: setupError } = data;

          return {
            timeRange,
            screenshots,
            error: setupError,
            elementsPositionAndAttributes: elements,
          };
        })
      );
    };
  }

  public checkPageIsOpen() {
    if (!this.driver.isPageOpen()) {
      throw getChromiumDisconnectedError();
    }
  }
}

const DEFAULT_SCREENSHOT_CLIP_HEIGHT = 1200;
const DEFAULT_SCREENSHOT_CLIP_WIDTH = 1800;

const getDefaultElementPosition = (dimensions: { height?: number; width?: number } | null) => {
  const height = dimensions?.height || DEFAULT_SCREENSHOT_CLIP_HEIGHT;
  const width = dimensions?.width || DEFAULT_SCREENSHOT_CLIP_WIDTH;

  return [
    {
      position: {
        boundingClientRect: { top: 0, left: 0, height, width },
        scroll: { x: 0, y: 0 },
      },
      attributes: {},
    },
  ];
};

/*
 * If Kibana is showing a non-HTML error message, the viewport might not be
 * provided by the browser.
 */
const getDefaultViewPort = () => ({
  height: DEFAULT_SCREENSHOT_CLIP_HEIGHT,
  width: DEFAULT_SCREENSHOT_CLIP_WIDTH,
  zoom: 1,
});
