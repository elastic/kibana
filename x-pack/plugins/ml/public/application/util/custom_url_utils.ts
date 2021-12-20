/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// utility functions for handling custom URLs

import { get, flow } from 'lodash';
import moment from 'moment';
import rison, { RisonObject, RisonValue } from 'rison-node';
import { parseInterval } from '../../../common/util/parse_interval';
import { escapeForElasticsearchQuery, replaceStringTokens } from './string_utils';
import {
  UrlConfig,
  KibanaUrlConfig,
  CustomUrlAnomalyRecordDoc,
} from '../../../common/types/custom_urls';
import { AnomalyRecordDoc } from '../../../common/types/anomalies';

// Value of custom_url time_range property indicating drilldown time range is calculated automatically
// depending on the context in which the URL is being opened.
const TIME_RANGE_AUTO = 'auto';

// Replaces the $ delimited tokens in the url_value of the custom URL configuration
// with values from the supplied document.
export function replaceTokensInUrlValue(
  customUrlConfig: UrlConfig | KibanaUrlConfig,
  jobBucketSpanSecs: number,
  doc: AnomalyRecordDoc,
  timeFieldName: 'timestamp' | string
) {
  // If urlValue contains $earliest$ and $latest$ tokens, add in times to the test doc.
  const urlValue = customUrlConfig.url_value;
  const timestamp = doc[timeFieldName];
  const timeRangeInterval =
    'time_range' in customUrlConfig && customUrlConfig.time_range
      ? parseInterval(customUrlConfig.time_range)
      : null;
  const record = { ...doc } as CustomUrlAnomalyRecordDoc;
  if (urlValue.includes('$earliest$')) {
    const earliestMoment = moment(timestamp);
    if (timeRangeInterval !== null) {
      earliestMoment.subtract(timeRangeInterval);
    } else {
      earliestMoment.subtract(jobBucketSpanSecs, 's');
    }
    record.earliest = earliestMoment.toISOString();
  }

  if (urlValue.includes('$latest$')) {
    const latestMoment = moment(timestamp).add(jobBucketSpanSecs, 's');
    if (timeRangeInterval !== null) {
      latestMoment.add(timeRangeInterval);
    } else {
      latestMoment.add(jobBucketSpanSecs, 's');
    }
    record.latest = latestMoment.toISOString();
  }

  return getUrlForRecord(customUrlConfig, record);
}

// Returns the URL to open from the supplied config, with any dollar delimited tokens
// substituted from the supplied anomaly record.
export function getUrlForRecord(
  urlConfig: UrlConfig | KibanaUrlConfig,
  record: CustomUrlAnomalyRecordDoc
) {
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
// `url` is the URL with any dollar delimited tokens from the urlConfig
// having been substituted with values from an anomaly record.
export function openCustomUrlWindow(url: string, urlConfig: UrlConfig, basePath: string) {
  // Run through a regex to test whether the url_value starts with a protocol scheme.
  if (/^(?:[a-z]+:)?\/\//i.test(urlConfig.url_value) === false) {
    // If `url` is a relative path, we need to prefix the base path.
    if (url.charAt(0) !== '/') {
      url = `${basePath}${isKibanaUrl(urlConfig) ? '/app/' : '/'}${url}`;
    }

    window.open(url, '_blank');
  } else {
    // Add noopener and noreferrr properties for external URLs.
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

    // Expect newWindow to be null, but just in case if not, reset the opener link.
    if (newWindow !== undefined && newWindow !== null) {
      newWindow.opener = null;
    }
  }
}

// Returns whether the url_value of the supplied config is for
// a Kibana Discover, Dashboard or supported solution page running
// on the same server as this ML plugin. This is necessary so we can have
// backwards compatibility with custom URLs created before the move to
// BrowserRouter and URLs without hashes. If we add another solution to
// recognize modules or with custom UI in the custom URL builder we'd
// need to add the solution here. Manually created custom URLs for other
// solution pages need to be prefixed with `app/` in the custom URL builder.
function isKibanaUrl(urlConfig: UrlConfig) {
  const urlValue = urlConfig.url_value;
  return (
    // HashRouter based plugins
    urlValue.startsWith('discover#/') ||
    urlValue.startsWith('dashboards#/') ||
    urlValue.startsWith('apm#/') ||
    // BrowserRouter based plugins
    urlValue.startsWith('metrics/') ||
    urlValue.startsWith('security/') ||
    // Legacy links
    urlValue.startsWith('siem#/')
  );
}

/**
 * Escape any double quotes in the value for correct use in KQL.
 */
export function escapeForKQL(value: string | number): string {
  return String(value).replace(/\"/g, '\\"');
}

type GetResultTokenValue = (v: string) => string;

export const isRisonObject = (value: RisonValue): value is RisonObject => {
  return value !== null && typeof value === 'object';
};

/**
 * Helper to grab field value from the string containing field value & name
 * which also handle special characters like colons and spaces
 * `odd:field$name&:"$odd:field$name&$"` => 'odd:field$name&'
 */
export const getQueryField = (str: string): string => {
  let fieldName = '';
  // Find the first valid '$' anchor which is the start of the field value
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '$') {
      let foundIdxToSplit = i;
      // Then back track to find the nearest colon on the left
      // the rest of string to the left of found colon
      // would be the field name
      for (let idx = foundIdxToSplit; idx > -1; idx--) {
        if (str[idx] === ':') {
          foundIdxToSplit = idx;
          break;
        }
      }

      // As the field name may contain both : and $,
      // we need to keep searching until the two sides match
      fieldName = str.slice(0, foundIdxToSplit).trim();
      let fieldValue = str.slice(foundIdxToSplit, str.length);
      const fieldValueStart = fieldValue.indexOf('$');
      const fieldValueEnd = fieldValue.lastIndexOf('$');
      fieldValue = fieldValue.slice(fieldValueStart, fieldValueEnd + 1);
      if (fieldValue === `$${fieldName}$`) {
        break;
      }
    }
  }
  return fieldName;
};
const getQueryStringResultProvider =
  (record: CustomUrlAnomalyRecordDoc, getResultTokenValue: GetResultTokenValue) =>
  (resultPrefix: string, queryString: string, resultPostfix: string, isKuery: boolean): string => {
    const URL_LENGTH_LIMIT = 2000;

    let availableCharactersLeft = URL_LENGTH_LIMIT - resultPrefix.length - resultPostfix.length;

    const testStr = queryString;
    // URL template might contain encoded characters
    const queryFields = testStr
      // Split query string by AND operator.
      .split(/\sand\s/i)
      // Get property name from `influencerField:$influencerField$` string.
      .map((v) => getQueryField(String(v).replace(/\\/g, '')));

    const queryParts: string[] = [];
    const joinOperator = ' AND ';

    fieldsLoop: for (let i = 0; i < queryFields.length; i++) {
      const field = queryFields[i];
      const fieldName = isKuery ? `"${queryFields[i]}"` : escapeForElasticsearchQuery(field);

      // Use lodash get to allow nested JSON fields to be retrieved.
      let tokenValues: string[] | string | null = get(record, field) || null;
      if (tokenValues === null) {
        continue;
      }
      tokenValues = Array.isArray(tokenValues) ? tokenValues : [tokenValues];

      // Create a pair `influencerField:value`.
      // In cases where there are multiple influencer field values for an anomaly
      // combine values with OR operator e.g. `(influencerField:value or influencerField:another_value)`.
      let result = '';
      for (let j = 0; j < tokenValues.length; j++) {
        const part = `${j > 0 ? ' OR ' : ''}${fieldName}:"${getResultTokenValue(tokenValues[j])}"`;

        // Build up a URL string which is not longer than the allowed length and isn't corrupted by invalid query.
        if (availableCharactersLeft < part.length) {
          if (result.length > 0) {
            queryParts.push(j > 0 ? `(${result})` : result);
          }
          break fieldsLoop;
        }

        result += part;

        availableCharactersLeft -= result.length;
      }

      if (result.length > 0) {
        queryParts.push(tokenValues.length > 1 ? `(${result})` : result);
      }
    }
    return queryParts.join(joinOperator);
  };

/**
 * Builds a Kibana dashboard or Discover URL from the supplied config, with any
 * dollar delimited tokens substituted from the supplied anomaly record.
 */
function buildKibanaUrl(urlConfig: UrlConfig, record: CustomUrlAnomalyRecordDoc) {
  const urlValue = urlConfig.url_value;

  const isLuceneQueryLanguage = urlValue.includes('language:lucene');

  const queryLanguageEscapeCallback = isLuceneQueryLanguage
    ? escapeForElasticsearchQuery
    : escapeForKQL;

  const commonEscapeCallback = flow(encodeURIComponent);

  const replaceSingleTokenValues = (str: string) => {
    const getResultTokenValue: GetResultTokenValue = flow(
      // Special characters inside of the filter should not be escaped for Lucene query language.
      isLuceneQueryLanguage ? <T>(v: T) => v : queryLanguageEscapeCallback,
      commonEscapeCallback
    );

    // Looking for a $token$ with an optional trailing slash
    return str.replace(/\$([^?&$\'"]+)\$(\/)?/g, (match, name: string, slash: string = '') => {
      // Use lodash get to allow nested JSON fields to be retrieved.
      let tokenValue: string | string[] | undefined = get(record, name);
      tokenValue = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;

      // If property not found token is replaced with an empty string.
      return tokenValue === undefined ? '' : getResultTokenValue(tokenValue) + slash;
    });
  };

  return flow(
    decodeURIComponent,
    (str: string) => str.replace('$earliest$', record.earliest).replace('$latest$', record.latest),
    // Process query string content of the URL
    (str: string) => {
      const getResultTokenValue: GetResultTokenValue = flow(
        queryLanguageEscapeCallback,
        commonEscapeCallback
      );

      const getQueryStringResult = getQueryStringResultProvider(record, getResultTokenValue);

      const match = str.match(/(.+)(\(.*\blanguage:(?:lucene|kuery)\b.*?\))(.+)/);

      if (match !== null && match[2] !== undefined) {
        const [, prefix, queryDef, postfix] = match;

        const isKuery = queryDef.indexOf('language:kuery') > -1;

        const q = rison.decode(queryDef);

        if (isRisonObject(q) && q.hasOwnProperty('query')) {
          const [resultPrefix, resultPostfix] = [prefix, postfix].map(replaceSingleTokenValues);
          const resultQuery = getQueryStringResult(
            resultPrefix,
            q.query as string,
            resultPostfix,
            isKuery
          );
          return `${resultPrefix}${rison.encode({ ...q, query: resultQuery })}${resultPostfix}`;
        }
      }

      return str.replace(
        /(.+&kuery=)(.*?)[^!](&.+)/,
        (fullMatch, prefix: string, queryString: string, postfix: string) => {
          const [resultPrefix, resultPostfix] = [prefix, postfix].map(replaceSingleTokenValues);
          const resultQuery = getQueryStringResult(
            resultPrefix,
            queryString,
            resultPostfix,
            str.indexOf('language:kuery') > -1
          );
          return `${resultPrefix}${resultQuery}${resultPostfix}`;
        }
      );
    },
    replaceSingleTokenValues
  )(urlValue);
}

// Returns whether the supplied label is valid for a custom URL.
export function isValidLabel(label: string, savedCustomUrls: any[]) {
  let isValid = label !== undefined && label.trim().length > 0;
  if (isValid === true && savedCustomUrls !== undefined) {
    // Check the label is unique.
    const existingLabels = savedCustomUrls.map((customUrl) => customUrl.url_name);
    isValid = !existingLabels.includes(label);
  }
  return isValid;
}

export function isValidTimeRange(timeRange: string): boolean {
  // Allow empty timeRange string, which gives the 'auto' behaviour.
  if (timeRange === undefined || timeRange.length === 0 || timeRange === TIME_RANGE_AUTO) {
    return true;
  }

  const interval = parseInterval(timeRange);
  return interval !== null;
}
