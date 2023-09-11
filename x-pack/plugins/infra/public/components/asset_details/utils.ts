/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraMetadata } from '../../../common/http_api';

export const toTimestampRange = ({ from, to }: { from: string; to: string }) => {
  const fromTs = new Date(from).getTime();
  const toTs = new Date(to).getTime();

  return { from: fromTs, to: toTs };
};

const DEFAULT_FROM_IN_MILLISECONDS = 15 * 60000;
export const getDefaultDateRange = () => {
  const now = Date.now();

  return {
    from: new Date(now - DEFAULT_FROM_IN_MILLISECONDS).toISOString(),
    to: new Date(now).toISOString(),
  };
};

export enum INTEGRATION_NAME {
  nginx = 'nginx',
  kubernetes = 'kubernetes',
}
export const INTEGRATIONS = {
  [INTEGRATION_NAME.nginx]: ['nginx.stubstatus', 'nginx.access'],
  [INTEGRATION_NAME.kubernetes]: ['kubernetes.node'],
};

export const getIntegrationAvailable = (
  integration: INTEGRATION_NAME,
  metadata?: InfraMetadata | null
) => {
  if (metadata) {
    return metadata?.features?.some((f) => INTEGRATIONS[integration].includes(f.name))
      ? integration
      : null;
  }
};
