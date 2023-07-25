/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';
import type { AssistantTelemetry } from '@kbn/elastic-assistant';
import type { StartServices } from '../../types';

export const useAssistantTelemetry = (): AssistantTelemetry => {
  const {
    services: { telemetry },
  } = useKibana<StartServices>();

  const reportAssistantInvoked = useCallback(
    (params: { location: string }) => {
      telemetry.reportAssistantInvoked(params);
    },
    [telemetry]
  );

  return {
    reportAssistantInvoked,
  };
};
