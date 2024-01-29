/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useActor } from '@xstate/react';
import React from 'react';
import { isDataStreamQualityMitigationInterpreter } from './mitigation_state_machine';
import {
  DataStreamQualityMitigationStateProvider,
  useDataStreamQualityMitigationStateContext,
} from './mitigation_state_machine_provider';
import { useDataStreamQualityChecksStateContext } from './state_machine_provider';

export const ConnectedMitigations = React.memo(() => {
  const [checkState] = useActor(useDataStreamQualityChecksStateContext());

  if (checkState.matches('mitigatingProblem')) {
    const mitigationStateService = checkState.children.mitigateProblem;

    if (!isDataStreamQualityMitigationInterpreter(mitigationStateService)) {
      return null;
    }

    return (
      <DataStreamQualityMitigationStateProvider mitigationStateService={mitigationStateService}>
        <ConnectedMitigationsContent />
      </DataStreamQualityMitigationStateProvider>
    );
  }

  return null;
});

const ConnectedMitigationsContent = React.memo(() => {
  const [mitigationState] = useActor(useDataStreamQualityMitigationStateContext());

  if (mitigationState.matches('')) {
    return null;
  }

  return null;
});
