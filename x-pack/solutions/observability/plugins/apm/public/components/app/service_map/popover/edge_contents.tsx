/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { EdgeDataDefinition } from 'cytoscape';
import { SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import type { ContentsProps } from '.';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { StatsList } from './stats_list';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type EdgeReturn = APIReturnType<'GET /internal/apm/service-map/dependency'>;

const INITIAL_STATE: Partial<EdgeReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

export function EdgeContents({ elementData, environment, start, end }: ContentsProps) {
  const edgeData = elementData as EdgeDataDefinition;

  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const { offset, comparisonEnabled } = query;

  const sourceServiceName = edgeData.sourceData[SERVICE_NAME] as string | undefined;
  const dependencies = edgeData.resources;

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (sourceServiceName && dependencies.length > 0) {
        return callApmApi('GET /internal/apm/service-map/dependency', {
          params: {
            query: {
              sourceServiceName,
              dependencies,
              environment,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        });
      }
    },
    [environment, sourceServiceName, dependencies, start, end, offset, comparisonEnabled]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <EuiFlexItem>
      <StatsList data={data} isLoading={isLoading} />
    </EuiFlexItem>
  );
}
