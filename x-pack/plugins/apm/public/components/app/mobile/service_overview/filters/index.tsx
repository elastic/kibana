/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiSelect,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../../hooks/use_breakpoints';
import { useFetcher, isPending } from '../../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { push } from '../../../../shared/links/url_helpers';

type MobileFilter =
  APIReturnType<'GET /internal/apm/services/{serviceName}/mobile/filters'>['mobileFilters'][0];

const ALL_OPTION = {
  value: 'all',
  text: 'All',
};

export function MobileFilters() {
  const history = useHistory();
  const { isSmall, isLarge } = useBreakpoints();
  const { serviceName } = useApmServiceContext();

  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      netConnectionType,
      device,
      osVersion,
      appVersion,
      transactionType,
    },
  } = useAnyOfApmParams(
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/transactions/view'
  );
  const filters = { netConnectionType, device, osVersion, appVersion };
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = { mobileFilters: [] }, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/mobile/filters',
        {
          params: {
            path: { serviceName },
            query: { end, environment, kuery, start, transactionType },
          },
        }
      );
    },
    [end, environment, kuery, serviceName, start, transactionType]
  );

  function toSelectOptions(items?: string[]) {
    return [
      ALL_OPTION,
      ...(items?.map((item) => ({ value: item, text: item })) || []),
    ];
  }

  function onChangeFilter(key: MobileFilter['key'], value: string) {
    push(history, {
      query: { [key]: value === ALL_OPTION.value ? '' : value },
    });
  }

  const groupDirection: EuiFlexGroupProps['direction'] = isLarge
    ? 'column'
    : 'row';

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      gutterSize="s"
      responsive={false}
      direction={groupDirection}
    >
      {isPending(status) ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        data.mobileFilters.map((filter) => {
          return (
            <EuiFlexItem
              grow={false}
              key={filter.key}
              style={isLarge ? {} : { width: '225px' }}
            >
              <EuiSelect
                fullWidth={isSmall}
                prepend={filter.label}
                options={toSelectOptions(filter.options)}
                value={filters[filter.key]}
                onChange={(e) => {
                  onChangeFilter(filter.key, e.target.value);
                }}
              />
            </EuiFlexItem>
          );
        })
      )}
    </EuiFlexGroup>
  );
}
