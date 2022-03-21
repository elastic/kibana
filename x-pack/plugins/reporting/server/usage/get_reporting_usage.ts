/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from 'kibana/server';
import { get } from 'lodash';
import { REPORTING_SYSTEM_INDEX } from '../../common/constants';
import type { ExportTypesRegistry } from '../lib/export_types_registry';
import type { GetLicense } from './';
import { getExportStats } from './get_export_stats';
import { getExportTypesHandler } from './get_export_type_handler';
import type {
  AggregationBuckets,
  AggregationResultBuckets,
  AvailableTotal,
  FeatureAvailabilityMap,
  JobTypes,
  KeyCountBucket,
  RangeStats,
  ReportingUsageType,
  StatusByAppBucket,
} from './types';

const JOB_TYPES_KEY = 'jobTypes';
const JOB_TYPES_FIELD = 'jobtype';
const LAYOUT_TYPES_KEY = 'layoutTypes';
const LAYOUT_TYPES_FIELD = 'meta.layout.keyword';
const OBJECT_TYPES_KEY = 'objectTypes';
const OBJECT_TYPE_DEPRECATED_KEY = 'meta.isDeprecated';
const OBJECT_TYPES_FIELD = 'meta.objectType.keyword';
const STATUS_TYPES_KEY = 'statusTypes';
const STATUS_BY_APP_KEY = 'statusByApp';
const STATUS_TYPES_FIELD = 'status';
const OUTPUT_SIZES_KEY = 'sizes';
const OUTPUT_SIZES_FIELD = 'output.size';

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
  const { buckets: jobBuckets } = aggs[JOB_TYPES_KEY] as AggregationBuckets;
  const jobTypes = jobBuckets.reduce((accum: JobTypes, bucket) => {
    const { key, doc_count: count, isDeprecated, sizes } = bucket;
    const deprecatedCount = isDeprecated?.doc_count;
    const total: Omit<AvailableTotal, 'available'> = {
      total: count,
      deprecated: deprecatedCount,
      sizes: sizes?.values,
    };
    return { ...accum, [key]: total };
  }, {} as JobTypes);

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

  return {
    _all: all,
    status: statusTypes,
    statuses: statusByApp,
    output_size: get(aggs[OUTPUT_SIZES_KEY], 'values') ?? undefined,
    ...jobTypes,
  };
}

type RangeStatSets = Partial<RangeStats> & {
  last7Days: Partial<RangeStats>;
};

// & ReportingUsageSearchResponse
type ESResponse = Partial<estypes.SearchResponse>;

async function handleResponse(response: ESResponse): Promise<Partial<RangeStatSets>> {
  const buckets = get(response, 'aggregations.ranges.buckets') as Record<
    'all' | 'last7Days',
    AggregationResultBuckets
  >;

  if (!buckets) {
    return {};
  }

  const { all, last7Days } = buckets;

  const last7DaysUsage = last7Days ? getAggStats(last7Days) : {};
  const allUsage = all ? getAggStats(all) : {};

  return {
    last7Days: last7DaysUsage,
    ...allUsage,
  };
}

export async function getReportingUsage(
  getLicense: GetLicense,
  esClient: ElasticsearchClient,
  exportTypesRegistry: ExportTypesRegistry
): Promise<ReportingUsageType> {
  const reportingIndex = REPORTING_SYSTEM_INDEX;
  const params = {
    index: `${reportingIndex}-*`,
    filter_path: 'aggregations.*.buckets',
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
            [JOB_TYPES_KEY]: {
              terms: { field: JOB_TYPES_FIELD, size: DEFAULT_TERMS_SIZE },
              aggs: {
                isDeprecated: { filter: { term: { [OBJECT_TYPE_DEPRECATED_KEY]: true } } },
                [OUTPUT_SIZES_KEY]: {
                  percentiles: { field: OUTPUT_SIZES_FIELD },
                },
              },
            },

            [STATUS_TYPES_KEY]: { terms: { field: STATUS_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
            [STATUS_BY_APP_KEY]: {
              terms: { field: 'status', size: DEFAULT_TERMS_SIZE },
              aggs: {
                jobTypes: {
                  terms: { field: JOB_TYPES_FIELD, size: DEFAULT_TERMS_SIZE },
                  aggs: {
                    appNames: { terms: { field: OBJECT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
                  },
                },
              },
            },
            [OBJECT_TYPES_KEY]: {
              filter: { term: { jobtype: PRINTABLE_PDF_JOBTYPE } },
              aggs: {
                pdf: { terms: { field: OBJECT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
              },
            },
            [LAYOUT_TYPES_KEY]: {
              filter: { term: { jobtype: PRINTABLE_PDF_JOBTYPE } },
              aggs: { pdf: { terms: { field: LAYOUT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } } },
            },
            [OUTPUT_SIZES_KEY]: {
              percentiles: { field: OUTPUT_SIZES_FIELD },
            },
          },
        },
      },
    },
  };

  const featureAvailability = await getLicense();
  return esClient
    .search(params)
    .then((response) => handleResponse(response))
    .then((usage: Partial<RangeStatSets>): ReportingUsageType => {
      const exportTypesHandler = getExportTypesHandler(exportTypesRegistry);
      const availability = exportTypesHandler.getAvailability(
        featureAvailability
      ) as FeatureAvailabilityMap;

      const { last7Days, ...all } = usage;

      return {
        available: true,
        enabled: true,
        last7Days: getExportStats(last7Days, availability, exportTypesHandler),
        ...getExportStats(all, availability, exportTypesHandler),
      };
    });
}
