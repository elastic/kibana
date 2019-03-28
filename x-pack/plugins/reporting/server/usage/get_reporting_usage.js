/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultsDeep, get } from 'lodash';
import { getDefaultObject } from './get_default_object';
import { getExportTypesHandler } from './get_export_type_handler';

// These keys can be anything, but they are used to bucket the aggregations so can't have periods in them
// like the field names can (otherwise we could have just used the field names themselves).
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

// index as set by "key" property, values are doc_count
const getKeyCount = buckets =>
  buckets.reduce((accum, { key, doc_count: count }) => ({ ...accum, [key]: count }), {});

function getRangeStats(range) {
  const _all = range.doc_count;
  const statusTypes = getKeyCount(get(range[STATUS_TYPES_KEY], 'buckets'));

  const jobBuckets = range[JOB_TYPES_KEY].buckets;
  const jobTypes = jobBuckets.reduce((accum, { key, doc_count: count }) => {
    return {
      ...accum,
      [key]: {
        available: true, // FIXME: determine if available per license
        total: count,
      },
    };
  }, {});

  // merge pdf stats into pdf jobtype key
  const pdfAppBuckets = get(range[OBJECT_TYPES_KEY], '.pdf.buckets');
  const pdfLayoutBuckets = get(range[LAYOUT_TYPES_KEY], '.pdf.buckets');
  jobTypes[PRINTABLE_PDF_JOBTYPE].app = getKeyCount(pdfAppBuckets);
  jobTypes[PRINTABLE_PDF_JOBTYPE].layout = getKeyCount(pdfLayoutBuckets);

  return { _all, status: statusTypes, ...jobTypes };
}

async function handleResponse(server, response) {
  const xpackInfo = server.plugins.xpack_main.info;
  const exportTypesHandler = await getExportTypesHandler(server);
  const availability = exportTypesHandler.getAvailability(xpackInfo);
  console.log(JSON.stringify(availability));

  const { all, last1, last7 } = get(response, 'aggregations.ranges.buckets');
  return {
    lastDay: getRangeStats(last1, availability),
    last7Days: getRangeStats(last7),
    ...getRangeStats(all),
  };
}

export async function getReportingUsage(server, callCluster) {
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
    .then(response => handleResponse(server, response))
    .then(usage => {
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
