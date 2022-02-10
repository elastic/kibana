/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState, useMemo } from 'react';

import type {
  INullableBaseStateContainer,
  PureTransition,
} from '../../../../../../../../../../../src/plugins/kibana_utils/public';
import {
  createStateContainer,
  syncState,
  createKbnUrlStateStorage,
  getStateFromKbnUrl,
} from '../../../../../../../../../../../src/plugins/kibana_utils/public';

import { DEFAULT_LOGS_STATE, STATE_STORAGE_KEY } from './constants';
import type { AgentLogsProps, AgentLogsState } from './agent_logs';
import { AgentLogsUI, AgentLogsUrlStateHelper } from './agent_logs';

export const AgentLogs: React.FunctionComponent<Pick<AgentLogsProps, 'agent' | 'agentPolicy'>> =
  memo(({ agent, agentPolicy }) => {
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
            ...getStateFromKbnUrl<AgentLogsState>(STATE_STORAGE_KEY, window.location.href, {
              getFromHashQuery: false,
            }),
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
      const stateStorage = createKbnUrlStateStorage({ useHashQuery: false, useHash: false });
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
        {isSyncReady ? <AgentLogsConnected agent={agent} agentPolicy={agentPolicy} /> : null}
      </AgentLogsUrlStateHelper.Provider>
    );
  });
