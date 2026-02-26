/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { isEdge } from './utils';
import type { ContentsProps } from './popover_content';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { StatsList } from './stats_list';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type EdgeReturn = APIReturnType<'GET /internal/apm/service-map/dependency'>;

const INITIAL_STATE: Partial<EdgeReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

export function EdgeContents({ selection, environment, start, end }: ContentsProps) {
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { offset, comparisonEnabled } = query;

  const isEdgeSelection = isEdge(selection);
  const sourceData = isEdgeSelection
    ? selection.data?.sourceData ?? { id: selection.source }
    : null;
  const resources = isEdgeSelection ? selection.data?.resources ?? [] : [];
  const sourceServiceName =
    sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;
  const dependencies = resources;

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

  if (!isEdgeSelection) {
    return null;
  }

  return (
    <EuiFlexItem>
      <StatsList data={data} isLoading={isLoading} />
    </EuiFlexItem>
  );
}
