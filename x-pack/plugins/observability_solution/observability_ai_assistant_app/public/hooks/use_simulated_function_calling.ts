/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aiAssistantSimulatedFunctionCalling } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from './use_kibana';

export function useSimulatedFunctionCalling() {
  const {
    services: { uiSettings },
  } = useKibana();

  const simulatedFunctionCallingEnabled = uiSettings.get<boolean>(
    aiAssistantSimulatedFunctionCalling,
    false
  );

  return { simulatedFunctionCallingEnabled };
}
