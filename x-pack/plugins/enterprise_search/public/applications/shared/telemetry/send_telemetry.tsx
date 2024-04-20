/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useActions } from 'kea';

import { TelemetryLogic, SendTelemetryHelper } from './telemetry_logic';

/**
 * React component helpers - useful for on-page-load/views
 */

export const SendEnterpriseSearchTelemetry = ({ action, metric }: SendTelemetryHelper) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'enterprise_search' });
  }, [action, metric]);

  return null;
};

export const SendAppSearchTelemetry = ({ action, metric }: SendTelemetryHelper) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'app_search' });
  }, [action, metric]);

  return null;
};

export const SendWorkplaceSearchTelemetry = ({ action, metric }: SendTelemetryHelper) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'workplace_search' });
  }, [action, metric]);

  return null;
};
