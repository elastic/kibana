/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { FieldFilter as Filter } from '../../../../../../../../src/plugins/data/common';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  SERVICE_NAME,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../../../common/elasticsearch_fieldnames';

import { APM_STATIC_INDEX_PATTERN_ID } from '../../../../../../../../src/plugins/apm_oss/public';

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
    query: { match_phrase: { [field]: value } },
  };
};

const getMultiMatchFilter = (field: string, values: string[]): Filter => {
  return {
    meta: {
      index: APM_STATIC_INDEX_PATTERN_ID,
      type: 'phrases',
      key: field,
      value: values.join(', '),
      params: values,
      alias: null,
      negate: false,
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
export const useMapFilters = (): Filter[] => {
  const { urlParams, uiFilters } = useUrlParams();

  const { serviceName } = urlParams;

  const { browser, device, os, location } = uiFilters;

  const [mapFilters, setMapFilters] = useState<Filter[]>([]);

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
    exists: {
      field: 'transaction.marks.navigationTiming.fetchStart',
    },
  };

  useEffect(() => {
    const filters = [existFilter];
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

    setMapFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceName, browser, device, os, location]);

  return mapFilters;
};
