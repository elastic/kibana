/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Environment } from '../../../../../../common/environment_rt';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { useFetcher } from '../../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { push } from '../../../../shared/links/url_helpers';

type MobileFilter =
  APIReturnType<'GET /internal/apm/services/{serviceName}/mobile/filters'>['mobileFilters'][0];

interface Props {
  end: string;
  environment: Environment;
  transactionType?: string;
  kuery: string;
  start: string;
  filters: Record<MobileFilter['key'], string | undefined>;
}

const ALL_OPTION = {
  value: 'all',
  text: 'All',
};

export function MobileFilters({
  end,
  environment,
  transactionType,
  kuery,
  start,
  filters,
}: Props) {
  const history = useHistory();
  const { serviceName } = useApmServiceContext();
  const { data = { mobileFilters: [] } } = useFetcher(
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

  console.log('data', data);

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      {data.mobileFilters.map((filter) => {
        return (
          <EuiFlexItem grow={false} key={filter.key}>
            <EuiSelect
              prepend={filter.label}
              options={toSelectOptions(filter.options)}
              value={filters[filter.key]}
              onChange={(e) => {
                onChangeFilter(filter.key, e.target.value);
              }}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
