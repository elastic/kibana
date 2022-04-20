/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers } from '@kbn/core/server';
import { defer, forkJoin, Observable, throwError } from 'rxjs';
import { catchError, mergeMap, switchMapTo, timeoutWith } from 'rxjs/operators';
import { errors } from '../../common';
import type { Context, HeadlessChromiumDriver } from '../browsers';
import { DEFAULT_VIEWPORT, getChromiumDisconnectedError } from '../browsers';
import { ConfigType, durationToNumber as toNumber } from '../config';
import type { Layout } from '../layouts';
import { Actions, EventLogger } from './event_logger';
import type { ElementsPositionAndAttribute } from './get_element_position_data';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getNumberOfItems } from './get_number_of_items';
import { getRenderErrors } from './get_render_errors';
import type { Screenshot } from './get_screenshots';
import { getScreenshots } from './get_screenshots';
import { getTimeRange } from './get_time_range';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import { waitForRenderComplete } from './wait_for_render';
import { waitForVisualizations } from './wait_for_visualizations';

type CaptureTimeouts = ConfigType['capture']['timeouts'];
export interface PhaseTimeouts extends CaptureTimeouts {
  loadDelay: ConfigType['capture']['loadDelay'];
}

type Url = string;
type UrlWithContext = [url: Url, context: Context];
export type UrlOrUrlWithContext = Url | UrlWithContext;

export interface ScreenshotObservableOptions {
  /**
   * The browser timezone that will be emulated in the browser instance.
   * This option should be used to keep timezone on server and client in sync.
   */
  browserTimezone?: string;

  /**
   * Custom headers to be sent with each request.
   */
  headers?: Headers;

  /**
   * The list or URL to take screenshots of.
   * Every item can either be a string or a tuple containing a URL and a context.
   */
  urls: UrlOrUrlWithContext[];
}

export interface ScreenshotObservableResult {
  /**
   * Used time range filter.
   */
  timeRange: string | null;

  /**
   * Taken screenshots.
   */
  screenshots: Screenshot[];

  /**
   * Error that occurred during the screenshotting.
   */
  error?: Error;

  /**
   * Individual visualizations might encounter errors at runtime. If there are any they are added to this
   * field. Any text captured here is intended to be shown to the user for debugging purposes, reporting
   * does no further sanitization on these strings.
   */
  renderErrors?: string[];

  /**
   * @internal
   */
  elementsPositionAndAttributes?: ElementsPositionAndAttribute[]; // NOTE: for testing
}

interface PageSetupResults {
  elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
  timeRange: string | null;
  error?: Error;
  renderErrors?: string[];
}

const getDefaultElementPosition = (
  dimensions: { height?: number; width?: number } | null,
  config: ConfigType
): ElementsPositionAndAttribute[] => {
  const height = dimensions?.height || DEFAULT_VIEWPORT.height;
  const width = dimensions?.width || DEFAULT_VIEWPORT.width;

  return [
    {
      position: {
        boundingClientRect: { top: 0, left: 0, height, width },
        scroll: { x: 0, y: 0 },
      },
      attributes: {},
      zoom: config.capture.zoom,
    },
  ];
};

/*
 * If Kibana is showing a non-HTML error message, the viewport might not be
 * provided by the browser.
 */
const getDefaultViewPort = () => ({
  ...DEFAULT_VIEWPORT,
  zoom: 1,
});

export class ScreenshotObservableHandler {
  constructor(
    private readonly driver: HeadlessChromiumDriver,
    private readonly config: ConfigType,
    private readonly eventLogger: EventLogger,
    private readonly layout: Layout,
    private options: ScreenshotObservableOptions
  ) {}

  /*
   * Decorates a TimeoutError with context of the phase that has timed out.
   */
  public waitUntil<O>(timeoutValue: number, label: string) {
    return (source: Observable<O>) =>
      source.pipe(
        catchError((error) => {
          throw new Error(`The "${label}" phase encountered an error: ${error}`);
        }),
        timeoutWith(
          timeoutValue,
          throwError(
            new Error(`The "${label}" phase took longer than ${timeoutValue / 1000} seconds.`)
          )
        )
      );
  }

  private openUrl(index: number, urlOrUrlWithContext: UrlOrUrlWithContext) {
    return defer(() => {
      let url: string;
      let context: Context | undefined;

      if (typeof urlOrUrlWithContext === 'string') {
        url = urlOrUrlWithContext;
      } else {
        [url, context] = urlOrUrlWithContext;
      }

      return openUrl(
        this.driver,
        this.eventLogger,
        toNumber(this.config.capture.timeouts.openUrl),
        index,
        url,
        { ...(context ?? {}), layout: this.layout.id },
        this.options.headers ?? {}
      );
    }).pipe(this.waitUntil(toNumber(this.config.capture.timeouts.openUrl), 'open URL'));
  }

  private waitForElements() {
    const driver = this.driver;
    const waitTimeout = toNumber(this.config.capture.timeouts.waitForElements);

    return defer(() => getNumberOfItems(driver, this.eventLogger, waitTimeout, this.layout)).pipe(
      mergeMap(async (itemsCount) => {
        // set the viewport to the dimensions from the job, to allow elements to flow into the expected layout
        const viewport = this.layout.getViewport(itemsCount) || getDefaultViewPort();

        // Set the viewport allowing time for the browser to handle reflow and redraw
        // before checking for readiness of visualizations.
        await driver.setViewport(viewport, this.eventLogger.kbnLogger);
        await waitForVisualizations(driver, this.eventLogger, waitTimeout, itemsCount, this.layout);
      }),
      this.waitUntil(waitTimeout, 'wait for elements')
    );
  }

  private completeRender() {
    const driver = this.driver;
    const layout = this.layout;
    const eventLogger = this.eventLogger;

    return defer(async () => {
      // Waiting till _after_ elements have rendered before injecting our CSS
      // allows for them to be displayed properly in many cases
      await injectCustomCss(driver, eventLogger, layout);

      this.eventLogger.positionElementsStart();
      // position panel elements for print layout
      await layout.positionElements?.(driver, eventLogger.kbnLogger);
      this.eventLogger.positionElementsEnd();

      await waitForRenderComplete(
        driver,
        eventLogger,
        toNumber(this.config.capture.loadDelay),
        layout
      );
    }).pipe(
      mergeMap(() =>
        forkJoin({
          timeRange: getTimeRange(driver, eventLogger, layout),
          elementsPositionAndAttributes: getElementPositionAndAttributes(
            driver,
            eventLogger,
            layout
          ),
          renderErrors: getRenderErrors(driver, eventLogger, layout),
        })
      ),
      this.waitUntil(toNumber(this.config.capture.timeouts.renderComplete), 'render complete')
    );
  }

  public setupPage(index: number, url: UrlOrUrlWithContext) {
    return this.openUrl(index, url).pipe(
      switchMapTo(this.waitForElements()),
      switchMapTo(this.completeRender())
    );
  }

  public getScreenshots() {
    return (withRenderComplete: Observable<PageSetupResults>) =>
      withRenderComplete.pipe(
        mergeMap(async (data: PageSetupResults): Promise<ScreenshotObservableResult> => {
          this.checkPageIsOpen(); // fail the report job if the browser has closed
          const elements =
            data.elementsPositionAndAttributes ??
            getDefaultElementPosition(this.layout.getViewport(1), this.config);
          let screenshots: Screenshot[] = [];
          try {
            screenshots = await getScreenshots(this.driver, this.eventLogger, elements);
          } catch (e) {
            const newError = new errors.FailedToCaptureScreenshot(e.message);
            this.eventLogger.error(newError, Actions.GET_SCREENSHOT);
            throw newError;
          }
          const { timeRange, error: setupError, renderErrors } = data;

          return {
            timeRange,
            screenshots,
            error: setupError,
            renderErrors,
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
