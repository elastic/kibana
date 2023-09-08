/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { IExecutionLogResult, IExecutionKPIResult } from '@kbn/actions-plugin/common';
import { ActionType } from '../../../../types';
import { loadActionTypes } from '../../../lib/action_connector_api';
import {
  loadGlobalConnectorExecutionKPIAggregations,
  LoadGlobalConnectorExecutionKPIAggregationsProps,
} from '../../../lib/action_connector_api/load_execution_kpi_aggregations';
import {
  loadGlobalConnectorExecutionLogAggregations,
  LoadGlobalConnectorExecutionLogAggregationsProps,
} from '../../../lib/action_connector_api/load_execution_log_aggregations';
import { useKibana } from '../../../../common/lib/kibana';

export interface ComponentOpts {
  loadActionTypes: () => Promise<ActionType[]>;
  loadGlobalConnectorExecutionLogAggregations: (
    props: LoadGlobalConnectorExecutionLogAggregationsProps
  ) => Promise<IExecutionLogResult>;
  loadGlobalConnectorExecutionKPIAggregations: (
    props: LoadGlobalConnectorExecutionKPIAggregationsProps
  ) => Promise<IExecutionKPIResult>;
}

export type PropsWithOptionalApiHandlers<T> = Omit<T, keyof ComponentOpts> & Partial<ComponentOpts>;

export function withActionOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithOptionalApiHandlers<T>> {
  return (props: PropsWithOptionalApiHandlers<T>) => {
    const { http } = useKibana().services;
    return (
      <WrappedComponent
        {...(props as T)}
        loadActionTypes={async () => loadActionTypes({ http })}
        loadGlobalConnectorExecutionLogAggregations={async (
          loadProps: LoadGlobalConnectorExecutionLogAggregationsProps
        ) =>
          loadGlobalConnectorExecutionLogAggregations({
            ...loadProps,
            http,
          })
        }
        loadGlobalConnectorExecutionKPIAggregations={async (
          loadGlobalExecutionKPIAggregationsProps: LoadGlobalConnectorExecutionKPIAggregationsProps
        ) =>
          loadGlobalConnectorExecutionKPIAggregations({
            ...loadGlobalExecutionKPIAggregationsProps,
            http,
          })
        }
      />
    );
  };
}
