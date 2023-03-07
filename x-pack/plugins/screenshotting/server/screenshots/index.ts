/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { HttpServiceSetup, KibanaRequest, Logger, PackageInfo } from '@kbn/core/server';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { Optional } from '@kbn/utility-types';
import { Semaphore } from '@kbn/std';
import ipaddr from 'ipaddr.js';
import { defaultsDeep, sum } from 'lodash';
import { from, Observable, of, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  first,
  map,
  mergeMap,
  take,
  takeUntil,
  tap,
  toArray,
} from 'rxjs/operators';
import {
  errors,
  LayoutParams,
  SCREENSHOTTING_APP_ID,
  SCREENSHOTTING_EXPRESSION,
  SCREENSHOTTING_EXPRESSION_INPUT,
} from '../../common';
import { HeadlessChromiumDriverFactory, PerformanceMetrics } from '../browsers';
import { systemHasInsufficientMemory } from '../cloud';
import type { ConfigType } from '../config';
import { durationToNumber } from '../config';
import {
  PdfScreenshotOptions,
  PdfScreenshotResult,
  PngScreenshotOptions,
  PngScreenshotResult,
  toPdf,
  toPng,
} from '../formats';
import { createLayout, Layout } from '../layouts';
import { EventLogger, Transactions } from './event_logger';
import type { ScreenshotObservableOptions, ScreenshotObservableResult } from './observable';
import { ScreenshotObservableHandler, UrlOrUrlWithContext } from './observable';

export type { ScreenshotObservableResult, UrlOrUrlWithContext } from './observable';

export interface CaptureOptions extends Optional<ScreenshotObservableOptions, 'urls'> {
  /**
   * Expression to render. Mutually exclusive with `urls`.
   */
  expression?: string | ExpressionAstExpression;

  /**
   * Expression input.
   */
  input?: unknown;

  /**
   * Layout parameters.
   */
  layout?: LayoutParams;

  /**
   * Source Kibana request object from where the headers will be extracted.
   */
  request?: KibanaRequest;
}

export type CaptureMetrics = PerformanceMetrics;

export interface CaptureResult {
  /**
   * Collected performance metrics during the screenshotting session.
   */
  metrics?: CaptureMetrics;

  /**
   * Screenshotting results.
   */
  results: ScreenshotObservableResult[];
}

export type ScreenshotOptions = PdfScreenshotOptions | PngScreenshotOptions;
export type ScreenshotResult = PdfScreenshotResult | PngScreenshotResult;

const DEFAULT_SETUP_RESULT = {
  elementsPositionAndAttributes: null,
  timeRange: null,
};

export class Screenshots {
  private semaphore: Semaphore;

  constructor(
    private readonly browserDriverFactory: HeadlessChromiumDriverFactory,
    private readonly logger: Logger,
    private readonly packageInfo: PackageInfo,
    private readonly http: HttpServiceSetup,
    private readonly config: ConfigType,
    private readonly cloud?: CloudSetup
  ) {
    this.semaphore = new Semaphore(config.poolSize);
  }

  private captureScreenshots(
    eventLogger: EventLogger,
    layout: Layout,
    options: ScreenshotObservableOptions
  ): Observable<CaptureResult> {
    const { browserTimezone } = options;

    return this.browserDriverFactory
      .createPage(
        {
          browserTimezone,
          openUrlTimeout: durationToNumber(this.config.capture.timeouts.openUrl),
          defaultViewport: { width: layout.width, deviceScaleFactor: layout.getBrowserZoom() },
        },
        this.logger
      )
      .pipe(
        this.semaphore.acquire(),
        mergeMap(({ driver, error$, close }) => {
          const screen: ScreenshotObservableHandler = new ScreenshotObservableHandler(
            driver,
            this.config,
            eventLogger,
            layout,
            options
          );

          return from(options.urls).pipe(
            concatMap((url, index) =>
              screen.setupPage(index, url).pipe(
                catchError((error) => {
                  screen.checkPageIsOpen(); // this fails the job if the browser has closed

                  this.logger.error(error);
                  eventLogger.error(error, Transactions.SCREENSHOTTING);
                  return of({ ...DEFAULT_SETUP_RESULT, error }); // allow "as-is" screenshot with injected warning message
                }),
                takeUntil(error$),
                screen.getScreenshots()
              )
            ),
            take(options.urls.length),
            toArray(),
            mergeMap((results) =>
              // At this point we no longer need the page, close it and send out the results
              close().pipe(map(({ metrics }) => ({ metrics, results })))
            )
          );
        }),
        first()
      );
  }

  private getScreenshottingAppUrl() {
    const info = this.http.getServerInfo();
    const { protocol, port } = info;
    let { hostname } = info;

    if (ipaddr.isValid(hostname) && !sum(ipaddr.parse(hostname).toByteArray())) {
      hostname = 'localhost';
    }

    return `${protocol}://${hostname}:${port}${this.http.basePath.serverBasePath}/app/${SCREENSHOTTING_APP_ID}`;
  }

  private getCaptureOptions({
    expression,
    input,
    request,
    ...options
  }: ScreenshotOptions): ScreenshotObservableOptions {
    const headers = { ...(request?.headers ?? {}), ...(options.headers ?? {}) };
    const urls = expression
      ? [
          [
            this.getScreenshottingAppUrl(),
            {
              [SCREENSHOTTING_EXPRESSION]: expression,
              [SCREENSHOTTING_EXPRESSION_INPUT]: input,
            },
          ] as UrlOrUrlWithContext,
        ]
      : options.urls;

    return defaultsDeep(
      {
        ...options,
        headers,
        urls,
      },
      {
        timeouts: {
          openUrl: 60000,
          waitForElements: 60000,
          renderComplete: 120000,
        },
        urls: [],
      }
    );
  }

  systemHasInsufficientMemory(): boolean {
    return systemHasInsufficientMemory(this.cloud, this.logger.get('cloud'));
  }

  getScreenshots(options: PngScreenshotOptions): Observable<PngScreenshotResult>;
  getScreenshots(options: PdfScreenshotOptions): Observable<PdfScreenshotResult>;
  getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult>;
  getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult> {
    if (this.systemHasInsufficientMemory()) {
      return throwError(() => new errors.InsufficientMemoryAvailableOnCloudError());
    }

    const eventLogger = new EventLogger(this.logger, this.config);
    const transactionEnd = eventLogger.startTransaction(Transactions.SCREENSHOTTING);

    const layout = createLayout(options.layout ?? {});
    const captureOptions = this.getCaptureOptions(options);

    return this.captureScreenshots(eventLogger, layout, captureOptions).pipe(
      tap(({ results, metrics }) => {
        transactionEnd({
          labels: {
            cpu: metrics?.cpu,
            memory: metrics?.memory,
            memory_mb: metrics?.memoryInMegabytes,
            ...eventLogger.getByteLengthFromCaptureResults(results),
          },
        });
      }),
      mergeMap((result) => {
        switch (options.format) {
          case 'pdf':
            return toPdf(eventLogger, this.packageInfo, layout, options, result);
          default:
            return toPng(result);
        }
      })
    );
  }
}
