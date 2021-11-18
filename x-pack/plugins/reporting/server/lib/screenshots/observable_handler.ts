/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { ScreenshotClip } from 'puppeteer';
import * as Rx from 'rxjs';
import { catchError, mergeMap, switchMap, switchMapTo, timeoutWith } from 'rxjs/operators';
import { Writable } from 'stream';
import { startTrace } from '..';
import { numberToDuration } from '../../../common/schema_utils';
import { UrlOrUrlLocatorTuple } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import { getChromiumDisconnectedError } from '../../browsers/chromium';
import {
  BufferedScreenshot,
  BufferedScreenshotResults,
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
import { ScreenshotStitcher } from './stitcher';
import { waitForRenderComplete } from './wait_for_render';
import { waitForVisualizations } from './wait_for_visualizations';

export class ScreenshotObservableHandler {
  private conditionalHeaders: ScreenshotObservableOpts['conditionalHeaders'];
  private layout: ScreenshotObservableOpts['layout'];
  private logger: ScreenshotObservableOpts['logger'];

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

    return (source: Rx.Observable<O>) =>
      source.pipe(
        catchError((error) => {
          throw new Error(`The "${label}" phase encountered an error: ${error}`);
        }),
        timeoutWith(
          timeoutValue,
          Rx.throwError(
            new Error(
              `The "${label}" phase took longer than ${numberToDuration(
                timeoutValue
              ).asSeconds()} seconds. You may need to increase "${configValue}"`
            )
          )
        )
      );
  }

  private openUrl(index: number, urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple) {
    return Rx.defer(() =>
      openUrl(
        this.timeouts.openUrl.timeoutValue,
        this.driver,
        index,
        urlOrUrlLocatorTuple,
        this.conditionalHeaders,
        this.logger
      )
    ).pipe(this.waitUntil(this.timeouts.openUrl));
  }

  private waitForElements() {
    const driver = this.driver;
    const waitTimeout = this.timeouts.waitForElements.timeoutValue;

    return Rx.defer(() => getNumberOfItems(waitTimeout, driver, this.layout, this.logger)).pipe(
      mergeMap((itemsCount) => {
        // set the viewport to the dimentions from the job, to allow elements to flow into the expected layout
        const viewport = this.layout.getViewport(itemsCount) || getDefaultViewPort();

        return Rx.forkJoin([
          driver.setViewport(viewport, this.logger),
          waitForVisualizations(waitTimeout, driver, itemsCount, this.layout, this.logger),
        ]);
      }),
      this.waitUntil(this.timeouts.waitForElements)
    );
  }

  private completeRender(apmTrans: apm.Transaction | null) {
    const driver = this.driver;
    const layout = this.layout;
    const logger = this.logger;

    return Rx.defer(async () => {
      // Waiting till _after_ elements have rendered before injecting our CSS
      // allows for them to be displayed properly in many cases
      await injectCustomCss(driver, layout, logger);

      const apmPositionElements = apmTrans?.startSpan('position_elements', 'correction');
      // position panel elements for print layout
      await layout.positionElements?.(driver, logger);
      apmPositionElements?.end();

      await waitForRenderComplete(this.timeouts.loadDelay, driver, layout, logger);
    }).pipe(
      mergeMap(() =>
        Rx.forkJoin({
          timeRange: getTimeRange(driver, layout, logger),
          elementsPositionAndAttributes: getElementPositionAndAttributes(driver, layout, logger),
          renderErrors: getRenderErrors(driver, layout, logger),
        })
      ),
      this.waitUntil(this.timeouts.renderComplete)
    );
  }

  public setupPage(
    index: number,
    urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple,
    apmTrans: apm.Transaction | null
  ) {
    return this.openUrl(index, urlOrUrlLocatorTuple).pipe(
      switchMapTo(this.waitForElements()),
      switchMapTo(this.completeRender(apmTrans))
    );
  }

  public getScreenshots() {
    return (withRenderComplete: Rx.Observable<PageSetupResults>) =>
      withRenderComplete.pipe(
        mergeMap(async (page: PageSetupResults): Promise<BufferedScreenshotResults> => {
          this.checkPageIsOpen(); // fail the report job if the browser has closed

          const elements =
            page.elementsPositionAndAttributes ??
            getDefaultElementPosition(this.layout.getViewport(1));

          const screenshots = (await getScreenshots(
            this.driver,
            elements,
            this.logger
          )) as BufferedScreenshot[];
          const { timeRange, error: setupError } = page;

          return {
            timeRange,
            screenshots,
            error: setupError,
            byteLength: screenshots.reduce((total, { byteLength }) => total + byteLength, 0),
            elementsPositionAndAttributes: elements,
          };
        })
      );
  }

  public streamScreenshots(stream: Writable) {
    return (withRenderComplete: Rx.Observable<PageSetupResults>) =>
      withRenderComplete.pipe(
        mergeMap(async (page: PageSetupResults): Promise<ScreenshotResults> => {
          this.checkPageIsOpen(); // fail the report job if the browser has closed

          const [element] =
            page.elementsPositionAndAttributes ??
            getDefaultElementPosition(this.layout.getViewport(1));
          const { title, description } = element.attributes;
          const { timeRange, error: setupError } = page;
          const { boundingClientRect, scroll } = element.position;

          let byteLength = 0;
          let screenshotCount = 0;

          this.logger.info(`streaming screenshots`);

          const dimensions = {
            x: boundingClientRect.left + scroll.x,
            y: boundingClientRect.top + scroll.y,
            height: boundingClientRect.height,
            width: boundingClientRect.width,
          };
          this.logger.debug(`Creating screenshot stream with: ${dimensionsAsString(dimensions)}`);
          const stitcher = new ScreenshotStitcher({ outputClip: dimensions });

          const endTrace = startTrace('get_screenshots', 'read');

          await stitcher
            .getClips$()
            .pipe(
              switchMap(async (clip) => {
                this.logger.debug(`Capturing screenshot at ${dimensionsAsString(clip)}`);

                let data: Buffer | undefined;
                try {
                  data = await this.driver.screenshot(clip);
                  if (!data || !data?.byteLength) {
                    throw new Error(`Buffer data is void!`);
                  }
                } catch (err) {
                  throw new Error(`Unable to capture screenshot: ${err}`);
                }

                this.logger.info(`Writing partial screenshot with ${data.byteLength} bytes.`);
                stream.write(data);

                byteLength += data.byteLength;
                screenshotCount += 1;
              })
            )
            .toPromise();

          endTrace();

          this.logger.info(`screenshots streamed: ${screenshotCount}`);

          return {
            screenshots: [{ title, description, byteLength }],
            timeRange,
            byteLength,
            error: setupError,
            elementsPositionAndAttributes: [element],
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

const dimensionsAsString = (dimensions: ScreenshotClip) => {
  return [
    `x:${dimensions.x}`,
    `y:${dimensions.y}`,
    `w:${dimensions.width}`,
    `h:${dimensions.height}`,
  ].toString();
};
