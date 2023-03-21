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
import {
  Context,
  DEFAULT_VIEWPORT,
  getChromiumDisconnectedError,
  HeadlessChromiumDriver,
} from '../browsers';
import { ConfigType, durationToNumber as toNumber } from '../config';
import type { PdfScreenshotOptions } from '../formats';
import { Layout } from '../layouts';
import { Actions, EventLogger } from './event_logger';
import type { ElementsPositionAndAttribute } from './get_element_position_data';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getNumberOfItems } from './get_number_of_items';
import { getPdf } from './get_pdf';
import { getRenderErrors } from './get_render_errors';
import { getScreenshots } from './get_screenshots';
import { getTimeRange } from './get_time_range';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import type { PhaseInstance, PhaseTimeouts, Screenshot } from './types';
import { waitForRenderComplete } from './wait_for_render';
import { waitForVisualizations } from './wait_for_visualizations';

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
  dimensions: { height?: number; width?: number } | null
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
    },
  ];
};

const getTimeouts = (captureConfig: ConfigType['capture']) => ({
  openUrl: {
    timeoutValue: toNumber(captureConfig.timeouts.openUrl),
    configValue: `xpack.screenshotting.capture.timeouts.openUrl`,
    label: 'open URL',
  },
  waitForElements: {
    timeoutValue: toNumber(captureConfig.timeouts.waitForElements),
    configValue: `xpack.screenshotting.capture.timeouts.waitForElements`,
    label: 'wait for elements',
  },
  renderComplete: {
    timeoutValue: toNumber(captureConfig.timeouts.renderComplete),
    configValue: `xpack.screenshotting.capture.timeouts.renderComplete`,
    label: 'render complete',
  },
});

export class ScreenshotObservableHandler {
  private timeouts: PhaseTimeouts;

  constructor(
    private readonly driver: HeadlessChromiumDriver,
    config: ConfigType,
    private readonly eventLogger: EventLogger,
    private readonly layout: Layout,
    private options: ScreenshotObservableOptions
  ) {
    this.timeouts = getTimeouts(config.capture);
  }

  /*
   * Decorates a TimeoutError with context of the phase that has timed out.
   */
  public waitUntil<O>(phase: PhaseInstance) {
    const { timeoutValue, label, configValue } = phase;
    return (source: Observable<O>) =>
      source.pipe(
        catchError((error) => {
          throw new Error(`The "${label}" phase encountered an error: ${error}`);
        }),
        timeoutWith(
          timeoutValue,
          throwError(
            new Error(
              `Screenshotting encountered a timeout error: "${label}" took longer than` +
                ` ${timeoutValue / 1000} seconds. You may need to increase "${configValue}"` +
                ` in kibana.yml.`
            )
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
        this.timeouts.openUrl.timeoutValue,
        index,
        url,
        { ...(context ?? {}), layout: this.layout.id },
        this.options.headers ?? {}
      );
    }).pipe(this.waitUntil(this.timeouts.openUrl));
  }

  private waitForElements() {
    const driver = this.driver;
    const waitTimeout = this.timeouts.waitForElements.timeoutValue * 1.8; // the waitUntil is needed to catch actually timing out

    return defer(() => getNumberOfItems(driver, this.eventLogger, waitTimeout, this.layout)).pipe(
      mergeMap((itemsCount) =>
        waitForVisualizations(driver, this.eventLogger, waitTimeout, itemsCount, this.layout)
      ),
      this.waitUntil(this.timeouts.waitForElements)
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

      const spanEnd = this.eventLogger.logScreenshottingEvent(
        'get positions of visualization elements',
        Actions.GET_ELEMENT_POSITION_DATA,
        'read'
      );
      try {
        // position panel elements for print layout
        await layout.positionElements?.(driver, eventLogger.kbnLogger);
        spanEnd();
      } catch (error) {
        eventLogger.error(error, Actions.GET_ELEMENT_POSITION_DATA);
        throw error;
      }

      await waitForRenderComplete(driver, eventLogger, layout);
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
      this.waitUntil(this.timeouts.renderComplete)
    );
  }

  public setupPage(index: number, url: UrlOrUrlWithContext) {
    return this.openUrl(index, url).pipe(
      switchMapTo(this.waitForElements()),
      switchMapTo(this.completeRender())
    );
  }

  /**
   * Given a title and time range value look like:
   *
   * "[Logs] Web Traffic - Apr 14, 2022 @ 120742.318 to Apr 21, 2022 @ 120742.318"
   *
   * Otherwise closest thing to that or a blank string.
   */
  private getTitle(timeRange: null | string): string {
    return `${(this.options as PdfScreenshotOptions).title ?? ''} ${
      timeRange ? `- ${timeRange}` : ''
    }`.trim();
  }

  private shouldCapturePdf(): boolean {
    return this.layout.id === 'print' && (this.options as PdfScreenshotOptions).format === 'pdf';
  }

  public getScreenshots() {
    return (withRenderComplete: Observable<PageSetupResults>) =>
      withRenderComplete.pipe(
        mergeMap(async (data: PageSetupResults): Promise<ScreenshotObservableResult> => {
          this.checkPageIsOpen(); // fail the report job if the browser has closed
          const elements =
            data.elementsPositionAndAttributes ??
            getDefaultElementPosition(this.layout.getViewport());
          let screenshots: Screenshot[] = [];
          try {
            screenshots = this.shouldCapturePdf()
              ? await getPdf(this.driver, this.eventLogger, this.getTitle(data.timeRange), {
                  logo: (this.options as PdfScreenshotOptions).logo,
                  error: data.error,
                })
              : await getScreenshots(this.driver, this.eventLogger, {
                  elements,
                  layout: this.layout,
                  error: data.error,
                });
          } catch (e) {
            throw new errors.FailedToCaptureScreenshot(e.message);
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
