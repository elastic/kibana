/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { ScreenshottingStart, PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import { ScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { CoreSetup, Logger, PluginInitializerContext } from '@kbn/core/server';
import { createConfig, ReportingConfigType } from '../../../config';
import { ReportingServerInfo } from '../../../core';
import { getTracker } from '../../common/pdf_tracker';
import type { PdfMetrics } from '../../../../common/types';
import { PdfScreenshotOptions } from '../../../types';
import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../../../../common/constants';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfMetrics;
  warnings: string[];
}

interface PdfInternalStart {
  screenshotting: ScreenshottingStart;
}

export class PdfCore {
  private pluginStartDeps!: PdfInternalStart;
  private config: ReportingConfigType;

  constructor(
    private core: CoreSetup,
    private logger: Logger,
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

  getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult>;
  getScreenshots(options: PdfScreenshotOptions) {
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
export function generatePdfObservable(
  reporting: PdfCore,
  options: PdfScreenshotOptions
): Rx.Observable<PdfResult> {
  const tracker = getTracker();
  tracker.startScreenshots();

  return reporting.getScreenshots(options).pipe(
    tap(({ metrics }) => {
      if (metrics.cpu) {
        tracker.setCpuUsage(metrics.cpu);
      }
      if (metrics.memory) {
        tracker.setMemoryUsage(metrics.memory);
      }
    }),
    mergeMap(async ({ data: buffer, errors, metrics, renderErrors }) => {
      tracker.endScreenshots();
      const warnings: string[] = [];
      if (errors) {
        warnings.push(...errors.map((error) => error.message));
      }
      if (renderErrors) {
        warnings.push(...renderErrors);
      }

      tracker.end();

      return {
        buffer,
        metrics,
        warnings,
      };
    })
  );
}
