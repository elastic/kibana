/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// utility functions for handling custom URLs

import _ from 'lodash';
import moment from 'moment';

import { parseInterval } from '../../common/util/parse_interval';
import {
  escapeForElasticsearchQuery,
  replaceStringTokens } from './string_utils';

// Value of custom_url time_range property indicating drilldown time range is calculated automatically
// depending on the context in which the URL is being opened.
const TIME_RANGE_AUTO = 'auto';

// Replaces the $ delimited tokens in the url_value of the custom URL configuration
// with values from the supplied document.
export function replaceTokensInUrlValue(customUrlConfig, jobBucketSpanSecs, doc, timeFieldName) {
  // If urlValue contains $earliest$ and $latest$ tokens, add in times to the test doc.
  const urlValue = customUrlConfig.url_value;
  const timestamp = doc[timeFieldName];
  const timeRangeInterval = parseInterval(customUrlConfig.time_range);
  if (urlValue.includes('$earliest$')) {
    const earliestMoment = moment(timestamp);
    if (timeRangeInterval !== null) {
      earliestMoment.subtract(timeRangeInterval);
    } else {
      earliestMoment.subtract(jobBucketSpanSecs, 's');
    }
    doc.earliest = earliestMoment.toISOString();
  }

  if (urlValue.includes('$latest$')) {
    const latestMoment = moment(timestamp).add(jobBucketSpanSecs, 's');
    if (timeRangeInterval !== null) {
      latestMoment.add(timeRangeInterval);
    } else {
      latestMoment.add(jobBucketSpanSecs, 's');
    }
    doc.latest = latestMoment.toISOString();
  }

  return getUrlForRecord(customUrlConfig, doc);
}

// Returns the URL to open from the supplied config, with any dollar delimited tokens
// substituted from the supplied anomaly record.
export function getUrlForRecord(urlConfig, record) {
  if (isKibanaUrl(urlConfig) === true) {
    return buildKibanaUrl(urlConfig, record);
  } else {
    const urlPath = replaceStringTokens(urlConfig.url_value, record, false);
    return urlPath;
  }
}

// Opens the specified URL in a new window. The behaviour (for example whether
// it opens in a new tab or window) is determined from the original configuration
// object which indicates whether it is opening a Kibana page running on the same server.
// fullUrl is the complete URL, including the base path, with any dollar delimited tokens
// from the urlConfig having been substituted with values from an anomaly record.
export function openCustomUrlWindow(fullUrl, urlConfig) {
  if (isKibanaUrl(urlConfig) === true) {
    window.open(fullUrl, '_blank');
  } else {
    const newWindow = window.open(fullUrl, '_blank', 'noopener,noreferrer');
    // Expect newWindow to be null, but just in case if not, reset the opener link.
    if (newWindow !== undefined && newWindow !== null) {
      newWindow.opener = null;
    }
  }
}

// Returns whether the url_value of the supplied config is for
// a Kibana page running on the same server as this ML plugin.
function isKibanaUrl(urlConfig) {
  const urlValue = urlConfig.url_value;
  return urlValue.startsWith('kibana#/discover') || urlValue.startsWith('kibana#/dashboard');
}

// Builds a Kibana dashboard or Discover URL from the supplied config, with any
// dollar delimited tokens substituted from the supplied anomaly record.
function buildKibanaUrl(urlConfig, record) {
  const urlValue = urlConfig.url_value;

  return String(urlValue).replace((/\$([^?&$\'"]{1,40})\$/g), (match, name) => {

    // Use lodash get to allow nested JSON fields to be retrieved.
    let tokenValue = _.get(record, name, null);

    // If the token is an influencer, then the value in the record will be an array.
    // For now just support passing the first influencer from the array.
    // TODO - support passing multiple influencer values.
    if (Array.isArray(tokenValue)) {
      tokenValue = tokenValue[0];
    }

    if (tokenValue !== null && !(name === 'earliest' || name === 'latest')) {

      if (urlValue.includes('language:lucene') === true) {
        // Escape reserved characters if the query language is lucene (default was switched to KQL in 7.1).
        tokenValue = `${escapeForElasticsearchQuery(tokenValue)}`;
      } else {
        // Escape any double quotes in the value for correct use in KQL.
        tokenValue = tokenValue.replace(/\"/g, '\\"');
      }

      // Kibana URLs used rison encoding, so escape with ! any ! or ' characters
      tokenValue = tokenValue.replace(/[!']/g, '!$&');

      // URI encode in case of special characters in the value.
      tokenValue = encodeURIComponent(tokenValue);
    }

    // If property not found string is not replaced.
    return (tokenValue !== null) ? tokenValue : match;
  });
}

// Returns whether the supplied label is valid for a custom URL.
export function isValidLabel(label, savedCustomUrls) {
  let isValid = (label !== undefined) && (label.trim().length > 0);
  if (isValid === true && (savedCustomUrls !== undefined)) {
    // Check the label is unique.
    const existingLabels = savedCustomUrls.map(customUrl => customUrl.url_name);
    isValid = !existingLabels.includes(label);
  }
  return isValid;
}

export function isValidTimeRange(timeRange) {
  // Allow empty timeRange string, which gives the 'auto' behaviour.
  if ((timeRange === undefined) || (timeRange.length === 0) || (timeRange === TIME_RANGE_AUTO)) {
    return true;
  }

  const interval = parseInterval(timeRange);
  return (interval !== null);
}
