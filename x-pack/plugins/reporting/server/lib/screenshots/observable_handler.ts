/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, mergeMap, timeout } from 'rxjs/operators';
import { numberToDuration } from '../../../common/schema_utils';
import { UrlOrUrlLocatorTuple } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import { getChromiumDisconnectedError } from '../../browsers/chromium';
import {
  PageSetupResults,
  PhaseInstance,
  PhaseTimeouts,
  ScreenshotObservableOpts,
  ScreenshotResults,
} from './';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getNumberOfItems } from './get_number_of_items';
import { getRenderErrors } from './get_render_errors';
import { getScreenshots } from './get_screenshots';
import { getTimeRange } from './get_time_range';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import { waitForRenderComplete } from './wait_for_render';
import { waitForVisualizations } from './wait_for_visualizations';

export class ScreenshotObservableHandler {
  private conditionalHeaders: ScreenshotObservableOpts['conditionalHeaders'];
  private layout: ScreenshotObservableOpts['layout'];
  private logger: ScreenshotObservableOpts['logger'];
  private waitErrorRegistered = false;

  constructor(
    private readonly driver: HeadlessChromiumDriver,
    opts: ScreenshotObservableOpts,
    private timeouts: PhaseTimeouts
  ) {
    this.conditionalHeaders = opts.conditionalHeaders;
    this.layout = opts.layout;
    this.logger = opts.logger;
  }

  /*
   * Decorates a TimeoutError with context of the phase that has timed out.
   */
  public waitUntil<O>(phase: PhaseInstance) {
    const { timeoutValue, label, configValue } = phase;
    return (source: Rx.Observable<O>) => {
      return source.pipe(
        timeout(timeoutValue),
        catchError((error: string | Error) => {
          if (this.waitErrorRegistered) {
            throw error; // do not create a stack of errors within the error
          }

          this.logger.error(error);
          let throwError = new Error(`The "${label}" phase encountered an error: ${error}`);

          if (error instanceof Rx.TimeoutError) {
            throwError = new Error(
              `The "${label}" phase took longer than` +
                ` ${numberToDuration(timeoutValue).asSeconds()} seconds.` +
                ` You may need to increase "${configValue}": ${error}`
            );
          }

          this.waitErrorRegistered = true;
          this.logger.error(throwError);
          throw throwError;
        })
      );
    };
  }

  private openUrl(index: number, urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple) {
    return mergeMap(() =>
      openUrl(
        this.timeouts.openUrl.timeoutValue,
        this.driver,
        index,
        urlOrUrlLocatorTuple,
        this.conditionalHeaders,
        this.logger
      )
    );
  }

  private waitForElements() {
    const driver = this.driver;
    const waitTimeout = this.timeouts.waitForElements.timeoutValue;
    return (withPageOpen: Rx.Observable<void>) =>
      withPageOpen.pipe(
        mergeMap(() => getNumberOfItems(waitTimeout, driver, this.layout, this.logger)),
        mergeMap(async (itemsCount) => {
          // set the viewport to the dimentions from the job, to allow elements to flow into the expected layout
          const viewport = this.layout.getViewport(itemsCount) || getDefaultViewPort();
          await Promise.all([
            driver.setViewport(viewport, this.logger),
            waitForVisualizations(waitTimeout, driver, itemsCount, this.layout, this.logger),
          ]);
        })
      );
  }

  private completeRender(apmTrans: apm.Transaction | null) {
    const driver = this.driver;
    const layout = this.layout;
    const logger = this.logger;

    return (withElements: Rx.Observable<void>) =>
      withElements.pipe(
        mergeMap(async () => {
          // Waiting till _after_ elements have rendered before injecting our CSS
          // allows for them to be displayed properly in many cases
          await injectCustomCss(driver, layout, logger);

          const apmPositionElements = apmTrans?.startSpan('position_elements', 'correction');
          // position panel elements for print layout
          await layout.positionElements?.(driver, logger);
          apmPositionElements?.end();

          await waitForRenderComplete(this.timeouts.loadDelay, driver, layout, logger);
        }),
        mergeMap(() =>
          Promise.all([
            getTimeRange(driver, layout, logger),
            getElementPositionAndAttributes(driver, layout, logger),
            getRenderErrors(driver, layout, logger),
          ]).then(([timeRange, elementsPositionAndAttributes, renderErrors]) => ({
            elementsPositionAndAttributes,
            timeRange,
            renderErrors,
          }))
        )
      );
  }

  public setupPage(
    index: number,
    urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple,
    apmTrans: apm.Transaction | null
  ) {
    return (initial: Rx.Observable<unknown>) =>
      initial.pipe(
        this.openUrl(index, urlOrUrlLocatorTuple),
        this.waitUntil(this.timeouts.openUrl),
        this.waitForElements(),
        this.waitUntil(this.timeouts.waitForElements),
        this.completeRender(apmTrans),
        this.waitUntil(this.timeouts.renderComplete)
      );
  }

  public getScreenshots() {
    return (withRenderComplete: Rx.Observable<PageSetupResults>) =>
      withRenderComplete.pipe(
        mergeMap(async (data: PageSetupResults): Promise<ScreenshotResults> => {
          this.checkPageIsOpen(); // fail the report job if the browser has closed

          const elements =
            data.elementsPositionAndAttributes ??
            getDefaultElementPosition(this.layout.getViewport(1));
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
