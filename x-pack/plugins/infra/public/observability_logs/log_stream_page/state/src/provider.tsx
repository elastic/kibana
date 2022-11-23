/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useState } from 'react';
import { useInterpret } from '@xstate/react';
import { InterpreterFrom } from 'xstate';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceId } from '../../../../containers/source_id';
import { LogStreamPageStateMachine } from './types';
import { createLogStreamPageStateMachine } from './state_machine';
import { connectComponentToProvider } from '../../../react_helpers/connect_component';

export const LogStreamPageStateContext = createContext({
  logStreamPageStateService: {} as InterpreterFrom<LogStreamPageStateMachine>,
});

export const LogStreamPageStateProvider = ({ children }: { children: React.ReactNode }) => {
  // NOTE: Remove sourceId and retrieving client directly from here once possible.
  const [sourceId] = useSourceId();

  const {
    services: {
      logViews: { client },
    },
  } = useKibanaContextForPlugin();

  const [logStreamPageStateMachine] = useState(() =>
    createLogStreamPageStateMachine({
      logViews: client,
      logViewId: sourceId,
    })
  );

  const logStreamPageStateService = useInterpret(logStreamPageStateMachine);

  logStreamPageStateService.onTransition((state) => {
    console.log(state);
  });
  return (
    <LogStreamPageStateContext.Provider value={{ logStreamPageStateService }}>
      {children}
    </LogStreamPageStateContext.Provider>
  );
};

// HOC
export const WithMachine = connectComponentToProvider(
  LogStreamPageStateContext,
  'logStreamPageStateService'
);
