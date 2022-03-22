/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Transaction } from 'elastic-apm-node';
import { from, of, Observable } from 'rxjs';
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
import type { KibanaRequest, Logger } from 'src/core/server';
import { LayoutParams } from '../../common';
import type { ConfigType } from '../config';
import type { HeadlessChromiumDriverFactory, PerformanceMetrics } from '../browsers';
import { createLayout } from '../layouts';
import type { Layout } from '../layouts';
import {
  PdfScreenshotOptions,
  PdfScreenshotResult,
  PngScreenshotOptions,
  PngScreenshotResult,
  toPdf,
  toPng,
} from '../formats';
import { ScreenshotObservableHandler } from './observable';
import type { ScreenshotObservableOptions, ScreenshotObservableResult } from './observable';
import { Semaphore } from './semaphore';

export type { UrlOrUrlWithContext } from './observable';
export type { ScreenshotObservableResult } from './observable';

export interface CaptureOptions extends ScreenshotObservableOptions {
  layout: LayoutParams;

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
    { poolSize }: ConfigType
  ) {
    this.semaphore = new Semaphore(poolSize);
  }

  private createLayout(transaction: Transaction | null, options: CaptureOptions): Layout {
    const apmCreateLayout = transaction?.startSpan('create-layout', 'setup');
    const layout = createLayout(options.layout);
    this.logger.debug(`Layout: width=${layout.width} height=${layout.height}`);
    apmCreateLayout?.end();

    return layout;
  }

  private captureScreenshots(
    layout: Layout,
    transaction: Transaction | null,
    options: CaptureOptions
  ): Observable<CaptureResult> {
    const apmCreatePage = transaction?.startSpan('create-page', 'wait');
    const {
      browserTimezone,
      timeouts: { openUrl: openUrlTimeout },
    } = options;
    const headers = { ...(options.request?.headers ?? {}), ...(options.headers ?? {}) };

    return this.browserDriverFactory
      .createPage(
        {
          browserTimezone,
          openUrlTimeout,
          defaultViewport: { height: layout.height, width: layout.width },
        },
        this.logger
      )
      .pipe(
        this.semaphore.acquire(),
        mergeMap(({ driver, unexpectedExit$, close }) => {
          apmCreatePage?.end();
          unexpectedExit$.subscribe({ error: () => transaction?.end() });

          const screen = new ScreenshotObservableHandler(driver, this.logger, layout, {
            ...options,
            headers,
          });

          return from(options.urls).pipe(
            concatMap((url, index) =>
              screen.setupPage(index, url, transaction).pipe(
                catchError((error) => {
                  screen.checkPageIsOpen(); // this fails the job if the browser has closed

                  this.logger.error(error);
                  return of({ ...DEFAULT_SETUP_RESULT, error }); // allow failover screenshot capture
                }),
                takeUntil(unexpectedExit$),
                screen.getScreenshots()
              )
            ),
            take(options.urls.length),
            toArray(),
            mergeMap((results) =>
              // At this point we no longer need the page, close it.
              close().pipe(
                tap(({ metrics }) => {
                  if (metrics) {
                    transaction?.setLabel('cpu', metrics.cpu, false);
                    transaction?.setLabel('memory', metrics.memory, false);
                  }
                }),
                map(({ metrics }) => ({ metrics, results }))
              )
            )
          );
        }),
        first()
      );
  }

  getScreenshots(options: PngScreenshotOptions): Observable<PngScreenshotResult>;
  getScreenshots(options: PdfScreenshotOptions): Observable<PdfScreenshotResult>;
  getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult>;
  getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult> {
    const transaction = apm.startTransaction('screenshot-pipeline', 'screenshotting');
    const layout = this.createLayout(transaction, options);

    return this.captureScreenshots(layout, transaction, options).pipe(
      mergeMap((result) => {
        switch (options.format) {
          case 'pdf':
            return toPdf(this.logger, layout, options, result);
          default:
            return toPng(result);
        }
      })
    );
  }
}
