/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { FieldFilter as Filter } from '@kbn/es-query';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../../../common/index_pattern_constants';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  SERVICE_NAME,
  TRANSACTION_URL,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../../../common/elasticsearch_fieldnames';

const getWildcardFilter = (field: string, value: string): Filter => {
  return {
    meta: {
      index: APM_STATIC_INDEX_PATTERN_ID,
      alias: null,
      negate: false,
      disabled: false,
      type: 'term',
      key: field,
      params: { query: value },
    },
    query: { wildcard: { [field]: { value: `*${value}*` } } },
  };
};

const getMatchFilter = (field: string, value: string): Filter => {
  return {
    meta: {
      index: APM_STATIC_INDEX_PATTERN_ID,
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: field,
      params: { query: value },
    },
    query: { term: { [field]: value } },
  };
};

const getMultiMatchFilter = (
  field: string,
  values: string[],
  negate = false
): Filter => {
  return {
    meta: {
      index: APM_STATIC_INDEX_PATTERN_ID,
      type: 'phrases',
      key: field,
      value: values.join(', '),
      params: values,
      alias: null,
      negate,
      disabled: false,
    },
    query: {
      bool: {
        should: values.map((value) => ({ match_phrase: { [field]: value } })),
        minimum_should_match: 1,
      },
    },
  };
};

const existFilter: Filter = {
  meta: {
    index: APM_STATIC_INDEX_PATTERN_ID,
    alias: null,
    negate: false,
    disabled: false,
    type: 'exists',
    key: 'transaction.marks.navigationTiming.fetchStart',
    value: 'exists',
  },
  query: {
    exists: {
      field: 'transaction.marks.navigationTiming.fetchStart',
    },
  },
};

export const useMapFilters = (): Filter[] => {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();

  const { serviceName, searchTerm } = urlParams;

  const {
    browser,
    device,
    os,
    location,
    transactionUrl,
    browserExcluded,
    deviceExcluded,
    osExcluded,
    locationExcluded,
    transactionUrlExcluded,
  } = uxUiFilters;

  return useMemo(() => {
    const filters: Filter[] = [existFilter];
    if (serviceName) {
      filters.push(getMatchFilter(SERVICE_NAME, serviceName));
    }
    if (browser) {
      filters.push(getMultiMatchFilter(USER_AGENT_NAME, browser));
    }
    if (device) {
      filters.push(getMultiMatchFilter(USER_AGENT_DEVICE, device));
    }
    if (os) {
      filters.push(getMultiMatchFilter(USER_AGENT_OS, os));
    }
    if (location) {
      filters.push(getMultiMatchFilter(CLIENT_GEO_COUNTRY_ISO_CODE, location));
    }
    if (transactionUrl) {
      filters.push(getMultiMatchFilter(TRANSACTION_URL, transactionUrl));
    }
    if (browserExcluded) {
      filters.push(getMultiMatchFilter(USER_AGENT_NAME, browserExcluded, true));
    }
    if (deviceExcluded) {
      filters.push(
        getMultiMatchFilter(USER_AGENT_DEVICE, deviceExcluded, true)
      );
    }
    if (osExcluded) {
      filters.push(getMultiMatchFilter(USER_AGENT_OS, osExcluded, true));
    }
    if (locationExcluded) {
      filters.push(
        getMultiMatchFilter(CLIENT_GEO_COUNTRY_ISO_CODE, locationExcluded, true)
      );
    }
    if (transactionUrlExcluded) {
      filters.push(
        getMultiMatchFilter(TRANSACTION_URL, transactionUrlExcluded, true)
      );
    }
    if (searchTerm) {
      filters.push(getWildcardFilter(TRANSACTION_URL, searchTerm));
    }

    return filters;
  }, [
    serviceName,
    browser,
    device,
    os,
    location,
    transactionUrl,
    browserExcluded,
    deviceExcluded,
    osExcluded,
    locationExcluded,
    transactionUrlExcluded,
    searchTerm,
  ]);
};
