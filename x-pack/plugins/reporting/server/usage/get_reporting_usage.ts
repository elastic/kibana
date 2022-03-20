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
  JobTypes,
  KeyCountBucket,
  LayoutCounts,
  MetricsStats,
  RangeStats,
  ReportingUsageType,
  SizePercentiles,
  StatusByAppBucket,
} from './types';

enum keys {
  JOB_TYPE = 'jobTypes',
  LAYOUT = 'layoutTypes',
  OBJECT_TYPE = 'objectTypes',
  STATUS_BY_APP = 'statusByApp',
  STATUS = 'statusTypes',
  OUTPUT_SIZE = 'sizes',
  IS_DEPRECATED = 'meta.isDeprecated',
  CSV_ROWS = 'csv_rows',
  PDF_CPU = 'pdf_cpu',
  PDF_MEM = 'pdf_memory',
  PDF_PAGES = 'pdf_pages',
  PNG_CPU = 'png_cpu',
  PNG_MEM = 'png_memory',
}
enum fields {
  JOB_TYPE = 'jobtype',
  LAYOUT = 'meta.layout.keyword',
  CSV_NUM_ROWS = 'metrics.csv.rows',
  PDF_CPU = 'metrics.pdf.cpuInPercentage',
  PDF_MEMORY = 'metrics.pdf.memoryInMegabytes',
  PDF_NUM_PAGES = 'metrics.pdf.pages',
  PNG_CPU = 'metrics.png.cpuInPercentage',
  PNG_MEMORY = 'metrics.png.memoryInMegabytes',
  OBJECT_TYPE = 'meta.objectType.keyword',
  OUTPUT_SIZE = 'output.size',
  STATUS = 'status',
}

const DEFAULT_TERMS_SIZE = 10;
const SIZE_PERCENTILES = [1, 5, 25, 50, 75, 95, 99];
const METRIC_PERCENTILES = [50, 75, 95, 99];

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

type JobType = Omit<AvailableTotal, 'available'> & {
  layout: LayoutCounts;
  metrics?: MetricsStats;
};

function getAggStats(
  aggs: AggregationResultBuckets,
  metrics?: { [K in keyof JobTypes]: MetricsStats }
): Partial<RangeStats> {
  const { buckets: jobBuckets } = aggs[keys.JOB_TYPE] as AggregationBuckets;
  const jobTypes = jobBuckets.reduce((accum: JobTypes, bucket) => {
    const { key, doc_count: count, isDeprecated, sizes, layoutTypes, objectTypes } = bucket;
    const deprecatedCount = isDeprecated?.doc_count;

    // format the search results into the telemetry schema
    const jobType: JobType = {
      total: count,
      deprecated: deprecatedCount,
      app: getKeyCount(get(objectTypes, 'buckets', [])),
      metrics: (metrics && metrics[key]) || undefined,
      sizes: get(sizes, 'values', {} as SizePercentiles),
      layout: getKeyCount(get(layoutTypes, 'buckets', [])),
    };
    return { ...accum, [key]: jobType };
  }, {} as JobTypes);

  const all = aggs.doc_count;
  let statusTypes = {};
  const statusBuckets = get(aggs[keys.STATUS], 'buckets', []);
  if (statusBuckets) {
    statusTypes = getKeyCount(statusBuckets);
  }

  let statusByApp = {};
  const statusAppBuckets = get(aggs[keys.STATUS_BY_APP], 'buckets', []);
  if (statusAppBuckets) {
    statusByApp = getAppStatuses(statusAppBuckets);
  }

  return {
    _all: all,
    status: statusTypes,
    statuses: statusByApp,
    output_size: get(aggs[keys.OUTPUT_SIZE], 'values') ?? undefined,
    ...jobTypes,
  };
}

function normalizeMetrics(metrics: estypes.AggregationsStringTermsAggregate | undefined) {
  if (!metrics) {
    return;
  }

  const metricBuckets = metrics.buckets as Array<
    { key: string } & { [key: string]: estypes.AggregationsPercentilesAggregateBase }
  >;
  return metricBuckets.reduce((accum, next) => {
    return {
      ...accum,
      [next.key]: {
        pdf_pages: next.pdf_pages,
        pdf_cpu: next.pdf_cpu,
        pdf_memory: next.pdf_memory,
        png_cpu: next.png_cpu,
        png_memory: next.png_memory,
        csv_rows: next.csv_rows,
      },
    };
  }, {} as { [K in keyof JobTypes]: MetricsStats });
}

type RangeStatSets = Partial<RangeStats> & { last7Days: Partial<RangeStats> };

type ESResponse = Partial<estypes.SearchResponse>;

async function handleResponse(response: ESResponse): Promise<RangeStatSets> {
  const ranges = (response.aggregations?.ranges as estypes.AggregationsFilterAggregate) || {};

  let last7DaysUsage: Partial<RangeStats> = {};
  let allUsage: Partial<RangeStats> = {};
  const rangesBuckets = ranges.buckets as Record<string, AggregationResultBuckets>;
  if (rangesBuckets) {
    const { all, last7Days } = rangesBuckets;

    last7DaysUsage = last7Days ? getAggStats(last7Days) : {};

    // calculate metrics per job type for the stats covering all-time
    const metrics = normalizeMetrics(
      response.aggregations?.metrics as estypes.AggregationsStringTermsAggregate
    );
    allUsage = all ? getAggStats(all, metrics) : {};
  }
  return { last7Days: last7DaysUsage, ...allUsage };
}

/*
 * Reporting Usage Collector's "fetch" method
 */
export async function getReportingUsage(
  getLicense: GetLicense,
  esClient: ElasticsearchClient,
  exportTypesRegistry: ExportTypesRegistry
): Promise<ReportingUsageType> {
  const reportingIndex = REPORTING_SYSTEM_INDEX;
  const params = {
    index: `${reportingIndex}-*`,
    filter_path: 'aggregations.*.buckets,aggregations.metrics_*',
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
            [keys.JOB_TYPE]: {
              terms: { field: fields.JOB_TYPE, size: DEFAULT_TERMS_SIZE },
              aggs: {
                isDeprecated: { filter: { term: { [keys.IS_DEPRECATED]: true } } },
                [keys.OUTPUT_SIZE]: {
                  percentiles: { field: fields.OUTPUT_SIZE, percents: SIZE_PERCENTILES },
                },
                [keys.LAYOUT]: { terms: { field: fields.LAYOUT, size: DEFAULT_TERMS_SIZE } },
                [keys.STATUS_BY_APP]: {
                  terms: { field: fields.STATUS, size: DEFAULT_TERMS_SIZE },
                  aggs: {
                    appNames: { terms: { field: fields.OBJECT_TYPE, size: DEFAULT_TERMS_SIZE } },
                  },
                },
                [keys.OBJECT_TYPE]: {
                  terms: { field: fields.OBJECT_TYPE, size: DEFAULT_TERMS_SIZE },
                },
              },
            },
            [keys.STATUS]: { terms: { field: fields.STATUS, size: DEFAULT_TERMS_SIZE } },
            [keys.OUTPUT_SIZE]: { percentiles: { field: fields.OUTPUT_SIZE } },
          },
        },
        metrics: {
          terms: { field: fields.JOB_TYPE, size: 10 },
          aggs: {
            [keys.CSV_ROWS]: {
              percentiles: { field: fields.CSV_NUM_ROWS, percents: METRIC_PERCENTILES },
            },
            [keys.PDF_PAGES]: {
              percentiles: { field: fields.PDF_NUM_PAGES, percents: METRIC_PERCENTILES },
            },
            [keys.PDF_MEM]: {
              percentiles: { field: fields.PDF_MEMORY, percents: METRIC_PERCENTILES },
            },
            [keys.PDF_CPU]: {
              percentiles: { field: fields.PDF_CPU, percents: METRIC_PERCENTILES },
            },
            [keys.PNG_MEM]: {
              percentiles: { field: fields.PNG_MEMORY, percents: METRIC_PERCENTILES },
            },
            [keys.PNG_CPU]: {
              percentiles: { field: fields.PNG_CPU, percents: METRIC_PERCENTILES },
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
      const availability = exportTypesHandler.getAvailability(featureAvailability);
      const { last7Days, ...all } = usage;

      return {
        available: true,
        enabled: true,
        last7Days: getExportStats(last7Days, availability, exportTypesHandler),
        ...getExportStats(all, availability, exportTypesHandler),
      };
    });
}
