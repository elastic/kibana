/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';

import { HttpSetup } from 'src/core/public';
import { KibanaContext, IKibanaContext } from '../../index';

interface ISendTelemetryProps {
  action: 'viewed' | 'error' | 'clicked';
  metric: string; // e.g., 'setup_guide'
}

interface ISendTelemetry extends ISendTelemetryProps {
  http: HttpSetup;
  product: 'app_search' | 'workplace_search' | 'enterprise_search';
}

/**
 * Base function - useful for non-component actions, e.g. clicks
 */

export const sendTelemetry = async ({ http, product, action, metric }: ISendTelemetry) => {
  try {
    await http.put(`/api/${product}/telemetry`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, metric }),
    });
  } catch (error) {
    throw new Error('Unable to send telemetry');
  }
};

/**
 * React component helpers - useful for on-page-load/views
 * TODO: SendWorkplaceSearchTelemetry and SendEnterpriseSearchTelemetry
 */

export const SendAppSearchTelemetry: React.FC<ISendTelemetryProps> = ({ action, metric }) => {
  const { http } = useContext(KibanaContext) as IKibanaContext;

  useEffect(() => {
    sendTelemetry({ http, action, metric, product: 'app_search' });
  }, [action, metric, http]);

  return null;
};
