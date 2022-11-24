/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useState } from 'react';
import { useInterpret } from '@xstate/react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceId } from '../../../../containers/source_id';
import { LogStreamPageStateService } from './types';
import { createLogStreamPageStateMachine } from './state_machine';

interface IContext {
  logStreamPageStateService: LogStreamPageStateService;
}

export const LogStreamPageStateContext = createContext<IContext>({
  logStreamPageStateService: {} as LogStreamPageStateService,
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

  return (
    <LogStreamPageStateContext.Provider value={{ logStreamPageStateService }}>
      {children}
    </LogStreamPageStateContext.Provider>
  );
};
