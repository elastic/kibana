/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { IExecutionLogResult, IExecutionKPIResult } from '@kbn/actions-plugin/common';
import { ActionType } from '../../../../types';
import {
  loadActionTypes,
  LoadGlobalExecutionLogAggregationsProps,
  loadGlobalConnectorExecutionLogAggregations,
  LoadGlobalExecutionKPIAggregationsProps,
  loadGlobalConnectorExecutionKPIAggregations,
} from '../../../lib/action_connector_api';
import { useKibana } from '../../../../common/lib/kibana';

export interface ComponentOpts {
  loadActionTypes: () => Promise<ActionType[]>;
  loadGlobalExecutionLogAggregations: (
    props: LoadGlobalExecutionLogAggregationsProps
  ) => Promise<IExecutionLogResult>;
  loadGlobalExecutionKPIAggregations: (
    props: LoadGlobalExecutionKPIAggregationsProps
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
        loadGlobalExecutionLogAggregations={async (
          loadProps: LoadGlobalExecutionLogAggregationsProps
        ) =>
          loadGlobalConnectorExecutionLogAggregations({
            ...loadProps,
            http,
          })
        }
        loadGlobalExecutionKPIAggregations={async (
          loadGlobalExecutionKPIAggregationsProps: LoadGlobalExecutionKPIAggregationsProps
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
