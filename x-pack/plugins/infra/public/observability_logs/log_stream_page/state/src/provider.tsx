/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import { isDevMode } from '../../../../utils/dev_mode';
import {
  createLogStreamPageStateMachine,
  type LogStreamPageStateMachineDependencies,
} from './state_machine';

export const useLogStreamPageState = ({
  kibanaQuerySettings,
  logViewStateNotifications,
  queryStringService,
  toastsService,
  filterManagerService,
  urlStateStorage,
  useDevTools = isDevMode(),
}: {
  useDevTools?: boolean;
} & LogStreamPageStateMachineDependencies) => {
  const logStreamPageStateService = useInterpret(
    () =>
      createLogStreamPageStateMachine({
        kibanaQuerySettings,
        logViewStateNotifications,
        queryStringService,
        toastsService,
        filterManagerService,
        urlStateStorage,
      }),
    { devTools: useDevTools }
  );

  return logStreamPageStateService;
};

export const [LogStreamPageStateProvider, useLogStreamPageStateContext] =
  createContainer(useLogStreamPageState);
