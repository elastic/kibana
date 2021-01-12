/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useEffect, useState, useMemo } from 'react';
import {
  createStateContainer,
  syncState,
  createKbnUrlStateStorage,
  INullableBaseStateContainer,
  PureTransition,
  getStateFromKbnUrl,
} from '../../../../../../../../../../../src/plugins/kibana_utils/public';
import { DEFAULT_LOGS_STATE, STATE_STORAGE_KEY } from './constants';
import { AgentLogsUI, AgentLogsProps, AgentLogsState, AgentLogsUrlStateHelper } from './agent_logs';

export const AgentLogs: React.FunctionComponent<Pick<AgentLogsProps, 'agent'>> = memo(
  ({ agent }) => {
    const stateContainer = useMemo(
      () =>
        createStateContainer<
          AgentLogsState,
          {
            update: PureTransition<AgentLogsState, [Partial<AgentLogsState>]>;
          }
        >(
          {
            ...DEFAULT_LOGS_STATE,
            ...getStateFromKbnUrl<AgentLogsState>(STATE_STORAGE_KEY, window.location.href),
          },
          {
            update: (state) => (updatedState) => ({ ...state, ...updatedState }),
          }
        ),
      []
    );

    const AgentLogsConnected = useMemo(
      () =>
        AgentLogsUrlStateHelper.connect<AgentLogsProps, 'state'>((state) => ({
          state: state || DEFAULT_LOGS_STATE,
        }))(AgentLogsUI),
      []
    );

    const [isSyncReady, setIsSyncReady] = useState<boolean>(false);

    useEffect(() => {
      const stateStorage = createKbnUrlStateStorage();
      const { start, stop } = syncState({
        storageKey: STATE_STORAGE_KEY,
        stateContainer: stateContainer as INullableBaseStateContainer<AgentLogsState>,
        stateStorage,
      });
      start();
      setIsSyncReady(true);

      return () => {
        stop();
        stateContainer.set(DEFAULT_LOGS_STATE);
      };
    }, [stateContainer]);

    return (
      <AgentLogsUrlStateHelper.Provider value={stateContainer}>
        {isSyncReady ? <AgentLogsConnected agent={agent} /> : null}
      </AgentLogsUrlStateHelper.Provider>
    );
  }
);
