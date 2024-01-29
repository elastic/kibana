/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { DataStreamQualityMitigationInterpreter } from './mitigation_state_machine';

export const useDataStreamQualityMitigationState = ({
  mitigationStateService,
}: {
  mitigationStateService: DataStreamQualityMitigationInterpreter;
}) => mitigationStateService;

export const [
  DataStreamQualityMitigationStateProvider,
  useDataStreamQualityMitigationStateContext,
] = createContainer(useDataStreamQualityMitigationState);
