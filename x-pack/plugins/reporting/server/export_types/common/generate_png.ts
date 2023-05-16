/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { CoreSetup, Logger, PluginInitializerContext } from '@kbn/core/server';
import * as Rx from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';
import {
  PngScreenshotResult,
  ScreenshottingStart,
  ScreenshotOptions,
} from '@kbn/screenshotting-plugin/server';
import {
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_TRANSACTION_TYPE,
} from '../../../common/constants';
import type { PngMetrics } from '../../../common/types';
import type { PngScreenshotOptions } from '../../types';
import { ReportingConfigType, createConfig } from '../../config';
import { ReportingServerInfo } from '../../core';

interface PngResult {
  buffer: Buffer;
  metrics?: PngMetrics;
  warnings: string[];
}

interface PngInternalStart {
  screenshotting: ScreenshottingStart;
}

export class PngCore {
  private pluginStartDeps!: PngInternalStart;
  private config: ReportingConfigType;
  // will this come from the plugin setup?
  core!: CoreSetup;

  constructor(
    core: CoreSetup,
    logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
  }

  /*
   * Gives synchronous access to the config
   */
  public getConfig(): ReportingConfigType {
    return this.config;
  }

  /*
   * Returns configurable server info
   */
  public getServerInfo(): ReportingServerInfo {
    const { http } = this.core;
    const serverInfo = http.getServerInfo();
    return {
      basePath: this.core.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }

  getScreenshots(options: PngScreenshotOptions): Rx.Observable<PngScreenshotResult>;
  getScreenshots(options: PngScreenshotOptions) {
    return Rx.defer(() => {
      return this.pluginStartDeps.screenshotting.getScreenshots({
        ...options,
        urls: options.urls.map((url) =>
          typeof url === 'string'
            ? url
            : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
        ),
      } as ScreenshotOptions);
    });
  }
}

export function generatePngObservable(
  reporting: PngCore,
  logger: Logger,
  options: Omit<PngScreenshotOptions, 'format'>
): Rx.Observable<PngResult> {
  const apmTrans = apm.startTransaction('generate-png', REPORTING_TRANSACTION_TYPE);
  if (!options.layout?.dimensions) {
    throw new Error(`LayoutParams.Dimensions is undefined.`);
  }

  const apmScreenshots = apmTrans?.startSpan('screenshots-pipeline', 'setup');
  let apmBuffer: typeof apm.currentSpan;

  return reporting
    .getScreenshots({
      ...options,
      format: 'png',
      layout: { id: 'preserve_layout', ...options.layout },
    })
    .pipe(
      tap(({ metrics }) => {
        if (metrics) {
          apmTrans?.setLabel('cpu', metrics.cpu, false);
          apmTrans?.setLabel('memory', metrics.memory, false);
        }
        apmScreenshots?.end();
        apmBuffer = apmTrans?.startSpan('get-buffer', 'output') ?? null;
      }),
      map(({ metrics, results }) => ({
        metrics,
        buffer: results[0].screenshots[0].data,
        warnings: results.reduce((found, current) => {
          if (current.error) {
            found.push(current.error.message);
          }
          if (current.renderErrors) {
            found.push(...current.renderErrors);
          }
          return found;
        }, [] as string[]),
      })),
      tap(({ buffer }) => {
        logger.debug(`PNG buffer byte length: ${buffer.byteLength}`);
        apmTrans?.setLabel('byte-length', buffer.byteLength, false);
      }),
      finalize(() => {
        apmBuffer?.end();
        apmTrans?.end();
      })
    );
}
