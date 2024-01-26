/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDevToolsOptions } from '@kbn/xstate-utils';
import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import {
  createDataStreamQualityChecksStateMachine,
  DataStreamQualityChecksStateMachineArguments,
} from './state_machine';
import { useDeepXStateLogger } from '../../utils/log_xstate_transition';

export const useDataStreamQualityChecksState = (
  initialArguments: DataStreamQualityChecksStateMachineArguments
) => {
  const deepLogger = useDeepXStateLogger();

  const ingestPathwaysStateService = useInterpret(
    () => createDataStreamQualityChecksStateMachine(initialArguments),
    { devTools: getDevToolsOptions() },
    deepLogger
  );

  return ingestPathwaysStateService;
};

export const [DataStreamQualityChecksStateProvider, useDataStreamQualityChecksStateContext] =
  createContainer(useDataStreamQualityChecksState);
