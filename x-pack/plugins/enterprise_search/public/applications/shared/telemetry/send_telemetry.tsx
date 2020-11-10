/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useActions } from 'kea';

import { TelemetryLogic, TSendTelemetry } from './telemetry_logic';

/**
 * React component helpers - useful for on-page-load/views
 */

export const SendEnterpriseSearchTelemetry: React.FC<TSendTelemetry> = ({ action, metric }) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'enterprise_search' });
  }, [action, metric]);

  return null;
};

export const SendAppSearchTelemetry: React.FC<TSendTelemetry> = ({ action, metric }) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'app_search' });
  }, [action, metric]);

  return null;
};

export const SendWorkplaceSearchTelemetry: React.FC<TSendTelemetry> = ({ action, metric }) => {
  const { sendTelemetry } = useActions(TelemetryLogic);

  useEffect(() => {
    sendTelemetry({ action, metric, product: 'workplace_search' });
  }, [action, metric]);

  return null;
};
