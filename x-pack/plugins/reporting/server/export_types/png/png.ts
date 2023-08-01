/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LicenseType } from '@kbn/licensing-plugin/server';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import apm from 'elastic-apm-node';
import { Writable } from 'stream';
import {
  fromEventPattern,
  mergeMap,
  finalize,
  takeUntil,
  tap,
  map,
  Observable,
  of,
  lastValueFrom,
} from 'rxjs';
import { validateUrls } from '@kbn/reporting-common/export_type_helpers/validate_urls';
import { JobParamsPNGDeprecated, TaskPayloadPNG } from './types';
import { decryptJobHeaders, ExportType, generatePngObservable, getFullUrls } from '../common';
import {
  LICENSE_TYPE_TRIAL,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_ENTERPRISE,
  PNG_JOB_TYPE,
  REPORTING_TRANSACTION_TYPE,
} from '../../../common/constants';

/**
 * @deprecated
 * Used for the Reporting Diagnostic
 */
export class PngV1ExportType extends ExportType<JobParamsPNGDeprecated, TaskPayloadPNG> {
  id = 'png';
  name = 'PNG';
  jobType = PNG_JOB_TYPE;
  jobContentEncoding? = 'base64' as const;
  jobContentExtension = 'png' as const;
  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('png-export-v1');
  }

  public createJob = async (jobParams: JobParamsPNGDeprecated) => {
    validateUrls([jobParams.relativeUrl]);
    return {
      ...jobParams,
      isDeprecated: true,
      forceNow: new Date().toISOString(),
    };
  };

  public runTask = (
    jobId: string,
    job: TaskPayloadPNG,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const apmTrans = apm.startTransaction('execute-job-png', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
    let apmGeneratePng: { end: () => void } | null | undefined;
    const { encryptionKey } = this.config;
    const jobLogger = this.logger.get(`execute:${jobId}`);

    const process$: Observable<TaskRunResult> = of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
      mergeMap((headers) => {
        const [url] = getFullUrls(this.getServerInfo(), this.config, job);

        apmGetAssets?.end();
        apmGeneratePng = apmTrans?.startSpan('generate-png-pipeline', 'execute');
        return generatePngObservable(
          () =>
            this.startDeps.reporting.getScreenshots({
              headers,
              urls: [url],
              browserTimezone: job.browserTimezone,
              layout: {
                ...job.layout,
                id: 'preserve_layout',
              },
            }),
          jobLogger,
          {
            headers,
            urls: [url],
            browserTimezone: job.browserTimezone,
            layout: {
              ...job.layout,
              id: 'preserve_layout',
            },
          }
        );
      }),
      tap(({ buffer }) => stream.write(buffer)),
      map(({ metrics, warnings }) => ({
        content_type: 'image/png',
        metrics: { png: metrics },
        warnings,
      })),
      tap({ error: (error) => jobLogger.error(error) }),
      finalize(() => apmGeneratePng?.end())
    );

    const stop$ = fromEventPattern(cancellationToken.on);
    return lastValueFrom(process$.pipe(takeUntil(stop$)));
  };
}
