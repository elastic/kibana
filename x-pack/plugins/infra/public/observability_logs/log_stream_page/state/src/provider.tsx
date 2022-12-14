/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import { isDevMode } from '../../../../utils/dev_mode';
import { type LogViewNotificationChannel } from '../../../log_view_state';
import { createLogStreamPageStateMachine } from './state_machine';

export const useLogStreamPageState = ({
  logViewStateNotifications,
  useDevTools = isDevMode(),
}: {
  logViewStateNotifications: LogViewNotificationChannel;
  useDevTools?: boolean;
}) => {
  const logStreamPageStateService = useInterpret(
    () =>
      createLogStreamPageStateMachine({
        logViewStateNotifications,
      }),
    { devTools: useDevTools }
  );

  return logStreamPageStateService;
};

export const [LogStreamPageStateProvider, useLogStreamPageStateContext] =
  createContainer(useLogStreamPageState);
