/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import { Writable } from 'stream';
import {
  ExportType,
  BaseExportTypeSetupDeps,
  BaseExportTypeStartDeps,
} from '../common/export_type';
import {
  CSV_JOB_TYPE,
  CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { getFieldFormats } from '../../services';
import { ReportingRequestHandlerContext } from '../../types';
import { JobParamsDownloadCSV } from './types';

/*
 * @TODO move to be within @kbn/reporitng-export-types
 * PR in place to try and remove this endpoint
 */

type CsvSearchSourceImmediateExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchSourceImmediateExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
}

/*
 * ImmediateExecuteFn receives the job doc payload because the payload was
 * generated in the ScheduleFn
 */
export type ImmediateExecuteFn = (
  jobId: null,
  job: JobParamsDownloadCSV,
  context: ReportingRequestHandlerContext,
  stream: Writable,
  req: KibanaRequest
) => Promise<TaskRunResult>;

export class CsvSearchSourceImmediateExportType extends ExportType<
  JobParamsDownloadCSV,
  ImmediateExecuteFn,
  CsvSearchSourceImmediateExportTypeSetupDeps,
  CsvSearchSourceImmediateExportTypeStartDeps
> {
  id = CSV_SEARCHSOURCE_IMMEDIATE_TYPE;
  name = CSV_SEARCHSOURCE_IMMEDIATE_TYPE;
  jobType = CSV_JOB_TYPE;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'csv' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];
  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    const logger = args[2];
    this.logger = logger.get('csv-searchsource-export');
  }

  // @ts-ignore expected to have a type failure due to deprecated export type
  public createJob = async (immediateJobParams: any): Promise<JobParamsDownloadCSV> => {
    return {
      ...immediateJobParams,
      objectType: 'immediate-search',
    };
  };

  // @ts-ignore expected type failure from deprecated export type
  public runTask = async (
    _jobId: string | null,
    immediateJobParams: JobParamsDownloadCSV,
    context: ReportingRequestHandlerContext,
    stream: Writable,
    req: KibanaRequest
  ) => {
    const job = await this.createJob(immediateJobParams);

    const dataPluginStart = await this.startDeps.data;
    const savedObjectsClient = (await context.core).savedObjects.client;
    const uiSettings = this.getUiSettingsServiceFactory(savedObjectsClient);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const [es, searchSourceStart] = await Promise.all([
      (await this.startDeps.esClient).asScoped(req),
      await dataPluginStart.search.searchSource.asScoped(req),
    ]);
    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(req),
      es,
    };
    const dependencies = {
      fieldFormatsRegistry,
      searchSourceStart,
    };
    const cancellationToken = new CancellationToken();
    const csvConfig = this.config.csv;
    const csv = new CsvGenerator(
      job,
      csvConfig,
      clients,
      dependencies,
      cancellationToken,
      this.logger,
      stream
    );
    const result = await csv.generateData();

    if (result.csv_contains_formulas) {
      this.logger.warn(`CSV may contain formulas whose values have been escaped`);
    }

    if (result.max_size_reached) {
      this.logger.warn(`Max size reached: CSV output truncated`);
    }

    const { warnings } = result;
    if (warnings) {
      warnings.forEach((warning) => {
        this.logger.warn(warning);
      });
    }

    return result;
  };
}
