/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  TabSummary,
  TabTerms,
  TabMetrics,
  TabJson,
  TabHistogram,
} from './tabs';

export const JOB_DETAILS_TAB_SUMMARY = 'Summary';
export const JOB_DETAILS_TAB_TERMS = 'Terms';
export const JOB_DETAILS_TAB_HISTOGRAM = 'Histogram';
export const JOB_DETAILS_TAB_METRICS = 'Metrics';
export const JOB_DETAILS_TAB_JSON = 'JSON';

const JOB_DETAILS_TABS = [
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
];

export const JobDetails = ({
  tab,
  job,
  stats,
  json,
}) => {
  const {
    metrics,
    terms,
    histogram,
    histogramInterval,
  } = job;

  const tabToContentMap = {
    Summary: (
      <TabSummary
        job={job}
        stats={stats}
      />
    ),
    Terms: (
      <TabTerms terms={terms} />
    ),
    Histogram: (
      <TabHistogram histogram={histogram} histogramInterval={histogramInterval} />
    ),
    Metrics: (
      <TabMetrics metrics={metrics} />
    ),
    JSON: (
      <TabJson json={json} />
    ),
  };

  return tabToContentMap[tab];
};

JobDetails.propTypes = {
  tab: PropTypes.oneOf(JOB_DETAILS_TABS),
  job: PropTypes.object,
};
