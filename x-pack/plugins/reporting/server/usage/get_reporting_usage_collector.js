/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { getExportTypesHandler } from './get_export_type_handler';
import { getReportCountsByParameter } from './get_reporting_type_counts';
import { KIBANA_REPORTING_TYPE } from '../../common/constants';
import { KIBANA_STATS_TYPE_MONITORING } from '../../../monitoring/common/constants';

/**
 * @typedef {Object} ReportingUsageStats  Almost all of these stats are optional.
 * @property {Number} _all: total number of reports across all types.
 * @property {Number} printable_pdf.total: number of pdf reports generated.
 * @property {Number} printable_pdf.available: If pdf reporting is available and enabled.
 * @property {Number} printable_pdf.layout.print: Count of pdf reports generated with print layout.
 * @property {Number} printable_pdf.layout.preview_layout: Count of pdf reports generated with preview layout.
 * @property {Object} printable_pdf.app.visualization: Count of reports generated from visualization app.
 * @property {Object} printable_pdf.app.dashboard: Count of reports generated from dashboard app.
 * @property {Object} status An object that will contain the count of reports that fall into each status bucket -
 * completed, failed, processing, pending.
 * @property {Number} csv.total: number of csv reports generated.
 * @property {Number} csv.available: If csv reporting is available and enabled.
 */

/**
 *
 * @param callCluster
 * @param server
 * @param {boolean} reportingAvailable - if true, we track some of the counts as 0 instead of undefined.
 * @param withinDayRange
 * @return {ReportingUsageStats}
 */
async function getReportingUsageWithinRange(callCluster, server, reportingAvailable, withinDayRange) {
  const xpackInfo = server.plugins.xpack_main.info;
  const config = server.config();

  // 1. gather job types and their availability, according to the export types registry and x-pack info
  const exportTypesHandler = await getExportTypesHandler(server);
  const availability = exportTypesHandler.getAvailability(xpackInfo);

  // These keys can be anything, but they are used to bucket the aggregations so can't have periods in them like
  // the field names can (otherwise we could have just used the field names themselves).
  const JOB_TYPES_KEY = 'jobTypes';
  const OBJECT_TYPES_KEY = 'objectTypes';
  const LAYOUT_TYPES_KEY = 'layoutTypes';
  const STATUS_TYPES_KEY = 'statusTypes';
  const fieldsAndSizes = [
    { key: JOB_TYPES_KEY, size: exportTypesHandler.getNumExportTypes(), name: 'jobtype' },
    { key: OBJECT_TYPES_KEY, size: 3, name: 'meta.objectType.keyword' },
    { key: LAYOUT_TYPES_KEY, size: 3, name: 'meta.layout.keyword' },
    { key: STATUS_TYPES_KEY, size: 4, name: 'status'  },
  ];

  const fieldTotals = await getReportCountsByParameter(callCluster, config, fieldsAndSizes, withinDayRange);

  // 2. combine types with jobs seen in the reporting data
  const { total, counts: jobTypeCounts } = fieldTotals[JOB_TYPES_KEY];

  // 3. merge availability and count info
  const keys = uniq([].concat(Object.keys(availability), Object.keys(jobTypeCounts)));

  const jobTypes = keys.reduce((accum, key) => {
    const availabilityFromData = availability[key];
    const jobTotalFromData = jobTypeCounts[key];

    let jobTotal; // if this remains undefined, the key/value gets removed in serialization
    if (jobTotalFromData || jobTotalFromData === 0) {
      jobTotal = jobTotalFromData;
    } else if (reportingAvailable) { // jobtype is not in the agg result because it has never been used
      jobTotal = 0;
    }

    return {
      ...accum,
      [key]: {
        available: availabilityFromData ? availabilityFromData : false,
        total: jobTotal,
      }
    };
  }, {});

  // These stats are only relevant for pdf job type.
  if (reportingAvailable && jobTypes.printable_pdf && jobTypes.printable_pdf.available) {
    const { counts: appCounts } = fieldTotals[OBJECT_TYPES_KEY];
    const { counts: layoutCounts } = fieldTotals[LAYOUT_TYPES_KEY];

    // If a customer has pdf reporting enabled but has never created a report of a given type, or on a given
    // app, it won't be returned. Hence we check for each value explicitly and track 0 if it doesn't exist.
    jobTypes.printable_pdf.app = {
      'visualization': appCounts.visualization || 0,
      'dashboard': appCounts.dashboard || 0,
    };
    jobTypes.printable_pdf.layout = {
      'print': layoutCounts.print || 0,
      'preserve_layout': layoutCounts.preserve_layout || 0,
    };
  }

  const { counts: statusCounts } = fieldTotals[STATUS_TYPES_KEY];

  return {
    _all: (total || total === 0) ? total : undefined,
    ...jobTypes,
    'status': {
      ...statusCounts
    }
  };
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getReportingUsageCollector(server, isReady) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_REPORTING_TYPE,
    isReady,
    fetch: async callCluster => {
      const xpackInfo = server.plugins.xpack_main.info;
      const config = server.config();
      const available = xpackInfo && xpackInfo.isAvailable(); // some form of reporting (csv at least) is available for all valid licenses
      const enabled = config.get('xpack.reporting.enabled'); // follow ES behavior: if its not available then its not enabled
      const reportingAvailable = available && enabled;

      const statsOverAllTime = await getReportingUsageWithinRange(callCluster, server, reportingAvailable);
      const statsOverLast1Day = await getReportingUsageWithinRange(callCluster, server, reportingAvailable, 1);
      const statsOverLast7Days = await getReportingUsageWithinRange(callCluster, server, reportingAvailable, 7);

      let browserType;
      if (enabled) {
        // Allow this to explicitly throw an exception if/when this config is deprecated,
        // because we shouldn't collect browserType in that case!
        browserType = config.get('xpack.reporting.capture.browser.type');
      }

      return {
        available,
        enabled: available && enabled, // similar behavior as _xpack API in ES
        browser_type: browserType,
        ...statsOverAllTime,
        lastDay: {
          ...statsOverLast1Day
        },
        last7Days: {
          ...statsOverLast7Days
        }
      };
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.reporting namespace of the data payload
     */
    formatForBulkUpload: result => {
      return {
        type: KIBANA_STATS_TYPE_MONITORING,
        payload: {
          usage: {
            xpack: {
              reporting: result
            }
          }
        }
      };
    }
  });
}
