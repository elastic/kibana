/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultsDeep, get } from 'lodash';
import { getDefaultObject } from './get_default_object';
// @ts-ignore untyped module
import { getExportTypesHandler } from './get_export_type_handler';
import {
  AggregationBuckets,
  AggregationResults,
  JobTypes,
  KeyCountBucket,
  RangeAggregationResults,
  RangeStats,
  UsageObject,
} from './types';

const JOB_TYPES_KEY = 'jobTypes';
const JOB_TYPES_FIELD = 'jobtype';
const LAYOUT_TYPES_KEY = 'layoutTypes';
const LAYOUT_TYPES_FIELD = 'meta.layout.keyword';
const OBJECT_TYPES_KEY = 'objectTypes';
const OBJECT_TYPES_FIELD = 'meta.objectType.keyword';
const STATUS_TYPES_KEY = 'statusTypes';
const STATUS_TYPES_FIELD = 'status';

const DEFAULT_TERMS_SIZE = 10;
const PRINTABLE_PDF_JOBTYPE = 'printable_pdf';

// indexes some key/count buckets by the "key" property
const getKeyCount = (buckets: KeyCountBucket[]): { [key: string]: number } =>
  buckets.reduce((accum, { key, doc_count: count }) => ({ ...accum, [key]: count }), {});

type FeatureSet = 'csv' | 'printable_pdf' | 'PNG';
type FeatureAvailabilitySet = { [F in FeatureSet]: boolean };

function getAggStats(aggs: AggregationResults, featureSet: FeatureAvailabilitySet) {
  const { buckets: jobBuckets } = aggs[JOB_TYPES_KEY] as AggregationBuckets;
  const jobTypes = jobBuckets.reduce((accum, { key, doc_count: count }) => {
    const feature = key as FeatureSet;
    return {
      ...accum,
      [feature]: {
        available: featureSet[feature],
        total: count,
      },
    };
  }, {}) as JobTypes;

  // merge pdf stats into pdf jobtype key
  const pdfJobs = jobTypes[PRINTABLE_PDF_JOBTYPE];
  if (pdfJobs) {
    const pdfAppBuckets = get(aggs[OBJECT_TYPES_KEY], '.pdf.buckets', []);
    const pdfLayoutBuckets = get(aggs[LAYOUT_TYPES_KEY], '.pdf.buckets', []);
    pdfJobs.app = getKeyCount(pdfAppBuckets) as {
      visualization: number;
      dashboard: number;
    };
    pdfJobs.layout = getKeyCount(pdfLayoutBuckets) as {
      print: number;
      preserve_layout: number;
    };
  }

  const all = aggs.doc_count as number;
  let statusTypes = {};
  const statusBuckets = get(aggs[STATUS_TYPES_KEY], 'buckets', []);
  if (statusBuckets) {
    statusTypes = getKeyCount(statusBuckets) as {
      completed: number;
      failed: number;
    };
  }

  return { _all: all, status: statusTypes, ...jobTypes };
}

type RangeStatSets = Partial<
  RangeStats & {
    lastDay: RangeStats;
    last7Days: RangeStats;
  }
>;
async function handleResponse(server: any, response: AggregationResults): Promise<RangeStatSets> {
  const xpackInfo = server.plugins.xpack_main.info;
  const exportTypesHandler = await getExportTypesHandler(server);
  const availability = exportTypesHandler.getAvailability(xpackInfo) as FeatureAvailabilitySet;

  const buckets = get(response, 'aggregations.ranges.buckets');
  if (!buckets) {
    return {};
  }
  const { all, last1, last7 } = buckets as RangeAggregationResults;

  const allUsage = all ? getAggStats(all, availability) : undefined;
  const lastDayUsage = last1 ? getAggStats(last1, availability) : undefined;
  const last7DaysUsage = last7 ? getAggStats(last7, availability) : undefined;

  return {
    last7Days: last7DaysUsage,
    lastDay: lastDayUsage,
    ...allUsage,
  };
}

export async function getReportingUsage(server: any, callCluster: any) {
  const config = server.config();
  const reportingIndex = config.get('xpack.reporting.index');

  const params = {
    rest_total_hits_as_int: true,
    index: `${reportingIndex}-*`,
    body: {
      size: 0,
      aggs: {
        ranges: {
          filters: {
            filters: {
              all: { match_all: {} },
              last1: { range: { created_at: { gte: 'now-1d/d' } } },
              last7: { range: { created_at: { gte: 'now-7d/d' } } },
            },
          },
          aggs: {
            [JOB_TYPES_KEY]: { terms: { field: JOB_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
            [STATUS_TYPES_KEY]: { terms: { field: STATUS_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
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

  return callCluster('search', params)
    .then((response: AggregationResults) => handleResponse(server, response))
    .then((usage: UsageObject) => {
      // Allow this to explicitly throw an exception if/when this config is deprecated,
      // because we shouldn't collect browserType in that case!
      const browserType = config.get('xpack.reporting.capture.browser.type');

      return {
        available: true,
        browser_type: browserType,
        ...defaultsDeep(usage, getDefaultObject()),
      };
    });
}
