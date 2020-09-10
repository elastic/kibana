/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { ReportingConfig } from '../';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import { GetLicense } from './';
import { decorateRangeStats } from './decorate_range_stats';
import { getExportTypesHandler } from './get_export_type_handler';
import {
  AggregationResultBuckets,
  FeatureAvailabilityMap,
  JobTypes,
  KeyCountBucket,
  RangeStats,
  ReportingUsageType,
  SearchResponse,
  StatusByAppBucket,
} from './types';

const JOB_TYPES_KEY = 'jobTypes';
const JOB_TYPES_FIELD = 'jobtype';
const LAYOUT_TYPES_KEY = 'layoutTypes';
const LAYOUT_TYPES_FIELD = 'meta.layout.keyword';
const OBJECT_TYPES_KEY = 'objectTypes';
const OBJECT_TYPES_FIELD = 'meta.objectType.keyword';
const STATUS_TYPES_KEY = 'statusTypes';
const STATUS_BY_APP_KEY = 'statusByApp';
const STATUS_TYPES_FIELD = 'status';

const DEFAULT_TERMS_SIZE = 10;
const PRINTABLE_PDF_JOBTYPE = 'printable_pdf';

// indexes some key/count buckets by the "key" property
const getKeyCount = <BucketType>(buckets: KeyCountBucket[]): BucketType =>
  buckets.reduce(
    (accum, { key, doc_count: count }) => ({ ...accum, [key]: count }),
    {} as BucketType
  );

// indexes some key/count buckets by statusType > jobType > appName: statusCount
const getAppStatuses = (buckets: StatusByAppBucket[]) =>
  buckets.reduce((statuses, statusBucket) => {
    return {
      ...statuses,
      [statusBucket.key]: statusBucket.jobTypes.buckets.reduce((jobTypes, job) => {
        return {
          ...jobTypes,
          [job.key]: job.appNames.buckets.reduce((apps, app) => {
            return {
              ...apps,
              [app.key]: app.doc_count,
            };
          }, {}),
        };
      }, {}),
    };
  }, {});

function getAggStats(aggs: AggregationResultBuckets): Partial<RangeStats> {
  const { buckets: jobBuckets } = aggs[JOB_TYPES_KEY];
  const jobTypes = jobBuckets.reduce(
    (accum: JobTypes, { key, doc_count: count }: { key: string; doc_count: number }) => {
      return { ...accum, [key]: { total: count } };
    },
    {} as JobTypes
  );

  // merge pdf stats into pdf jobtype key
  const pdfJobs = jobTypes[PRINTABLE_PDF_JOBTYPE];
  if (pdfJobs) {
    const pdfAppBuckets = get(aggs[OBJECT_TYPES_KEY], 'pdf.buckets', []);
    const pdfLayoutBuckets = get(aggs[LAYOUT_TYPES_KEY], 'pdf.buckets', []);
    pdfJobs.app = getKeyCount(pdfAppBuckets);
    pdfJobs.layout = getKeyCount(pdfLayoutBuckets);
  }

  const all = aggs.doc_count;
  let statusTypes = {};
  const statusBuckets = get(aggs[STATUS_TYPES_KEY], 'buckets', []);
  if (statusBuckets) {
    statusTypes = getKeyCount(statusBuckets);
  }

  let statusByApp = {};
  const statusAppBuckets = get(aggs[STATUS_BY_APP_KEY], 'buckets', []);
  if (statusAppBuckets) {
    statusByApp = getAppStatuses(statusAppBuckets);
  }

  return { _all: all, status: statusTypes, statuses: statusByApp, ...jobTypes };
}

type RangeStatSets = Partial<RangeStats> & {
  last7Days: Partial<RangeStats>;
};

async function handleResponse(response: SearchResponse): Promise<Partial<RangeStatSets>> {
  const buckets = get(response, 'aggregations.ranges.buckets');
  if (!buckets) {
    return {};
  }
  const { last7Days, all } = buckets as any;

  const last7DaysUsage = last7Days ? getAggStats(last7Days) : {};
  const allUsage = all ? getAggStats(all) : {};

  return {
    last7Days: last7DaysUsage,
    ...allUsage,
  };
}

export async function getReportingUsage(
  config: ReportingConfig,
  getLicense: GetLicense,
  callCluster: CallCluster,
  exportTypesRegistry: ExportTypesRegistry
): Promise<ReportingUsageType> {
  const reportingIndex = config.get('index');

  const params = {
    index: `${reportingIndex}-*`,
    filterPath: 'aggregations.*.buckets',
    body: {
      size: 0,
      aggs: {
        ranges: {
          filters: {
            filters: {
              all: { match_all: {} },
              last7Days: { range: { created_at: { gte: 'now-7d/d' } } },
            },
          },
          aggs: {
            [JOB_TYPES_KEY]: { terms: { field: JOB_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
            [STATUS_TYPES_KEY]: { terms: { field: STATUS_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
            [STATUS_BY_APP_KEY]: {
              terms: { field: 'status', size: DEFAULT_TERMS_SIZE },
              aggs: {
                jobTypes: {
                  terms: { field: JOB_TYPES_FIELD, size: DEFAULT_TERMS_SIZE },
                  aggs: {
                    appNames: { terms: { field: OBJECT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } }, // NOTE Discover/CSV export is missing the 'meta.objectType' field, so Discover/CSV results are missing for this agg
                  },
                },
              },
            },
            [OBJECT_TYPES_KEY]: {
              filter: { term: { jobtype: PRINTABLE_PDF_JOBTYPE } },
              aggs: { pdf: { terms: { field: OBJECT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } } },
            },
            [LAYOUT_TYPES_KEY]: {
              filter: { term: { jobtype: PRINTABLE_PDF_JOBTYPE } },
              aggs: { pdf: { terms: { field: LAYOUT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } } },
            },
          },
        },
      },
    },
  };

  const featureAvailability = await getLicense();
  return callCluster('search', params)
    .then((response: SearchResponse) => handleResponse(response))
    .then(
      (usage: Partial<RangeStatSets>): ReportingUsageType => {
        // Allow this to explicitly throw an exception if/when this config is deprecated,
        // because we shouldn't collect browserType in that case!
        const browserType = config.get('capture', 'browser', 'type');

        const exportTypesHandler = getExportTypesHandler(exportTypesRegistry);
        const availability = exportTypesHandler.getAvailability(
          featureAvailability
        ) as FeatureAvailabilityMap;

        const { last7Days, ...all } = usage;

        return {
          available: true,
          browser_type: browserType,
          enabled: true,
          last7Days: decorateRangeStats(last7Days, availability),
          ...decorateRangeStats(all, availability),
        };
      }
    );
}
