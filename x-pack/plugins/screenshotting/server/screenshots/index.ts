/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ipaddr from 'ipaddr.js';
import { sum, defaultsDeep } from 'lodash';
import apm from 'elastic-apm-node';
import type { Transaction } from 'elastic-apm-node';
import { from, of, Observable } from 'rxjs';
import type { Optional } from '@kbn/utility-types';
import type { DeepPartial } from 'utility-types';
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
import type { HttpServiceSetup, KibanaRequest, Logger, PackageInfo } from 'src/core/server';
import type { ExpressionAstExpression } from 'src/plugins/expressions/common';
import {
  LayoutParams,
  SCREENSHOTTING_APP_ID,
  SCREENSHOTTING_EXPRESSION,
  SCREENSHOTTING_EXPRESSION_INPUT,
} from '../../common';
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
import { ScreenshotObservableHandler, UrlOrUrlWithContext } from './observable';
import type { ScreenshotObservableOptions, ScreenshotObservableResult } from './observable';
import { Semaphore } from './semaphore';

export type { UrlOrUrlWithContext } from './observable';
export type { ScreenshotObservableResult } from './observable';

export interface CaptureOptions
  extends Optional<Omit<ScreenshotObservableOptions, 'timeouts'>, 'urls'>,
    DeepPartial<Pick<ScreenshotObservableOptions, 'timeouts'>> {
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
    { poolSize }: ConfigType
  ) {
    this.semaphore = new Semaphore(poolSize);
  }

  private createLayout(transaction: Transaction | null, options: CaptureOptions): Layout {
    const apmCreateLayout = transaction?.startSpan('create-layout', 'setup');
    const layout = createLayout(options.layout ?? {});
    this.logger.debug(`Layout: width=${layout.width} height=${layout.height}`);
    apmCreateLayout?.end();

    return layout;
  }

  private captureScreenshots(
    layout: Layout,
    transaction: Transaction | null,
    options: ScreenshotObservableOptions
  ): Observable<CaptureResult> {
    const apmCreatePage = transaction?.startSpan('create-page', 'wait');
    const {
      browserTimezone,
      timeouts: { openUrl: openUrlTimeout },
    } = options;

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

          const screen = new ScreenshotObservableHandler(driver, this.logger, layout, options);

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
          waitForElements: 30000,
          renderComplete: 30000,
          loadDelay: 3000,
        },
        urls: [],
      }
    );
  }

  getScreenshots(options: PngScreenshotOptions): Observable<PngScreenshotResult>;
  getScreenshots(options: PdfScreenshotOptions): Observable<PdfScreenshotResult>;
  getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult>;
  getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult> {
    const transaction = apm.startTransaction('screenshot-pipeline', 'screenshotting');
    const layout = this.createLayout(transaction, options);
    const captureOptions = this.getCaptureOptions(options);

    return this.captureScreenshots(layout, transaction, captureOptions).pipe(
      mergeMap((result) => {
        switch (options.format) {
          case 'pdf':
            return toPdf(this.logger, this.packageInfo, layout, options, result);
          default:
            return toPng(result);
        }
      })
    );
  }
}
