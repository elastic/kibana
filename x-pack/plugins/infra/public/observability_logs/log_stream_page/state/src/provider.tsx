/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret } from '@xstate/react';
import React, { createContext } from 'react';
import { type LogViewNotificationChannel } from '../../../log_view_state';
import { createLogStreamPageStateMachine } from './state_machine';
import { type LogStreamPageStateService } from './types';

interface IContext {
  logStreamPageStateService: LogStreamPageStateService;
}

export const LogStreamPageStateContext = createContext<IContext>({
  logStreamPageStateService: {} as LogStreamPageStateService,
});

export const LogStreamPageStateProvider: React.FC<{
  logViewStateNotifications: LogViewNotificationChannel;
}> = ({ children, logViewStateNotifications }) => {
  const logStreamPageStateService = useInterpret(() =>
    createLogStreamPageStateMachine({
      logViewStateNotifications,
    })
  );

  return (
    <LogStreamPageStateContext.Provider value={{ logStreamPageStateService }}>
      {children}
    </LogStreamPageStateContext.Provider>
  );
};
