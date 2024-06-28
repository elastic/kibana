/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';

async function navigate({ configId, locationId }: { configId: string; locationId?: string }) {
  const locationUrlQueryParam = locationId ? `?locationId=${locationId}` : '';
  return {
    app: 'synthetics',
    path: `/monitor/${configId}${locationUrlQueryParam}`,
    state: {},
  };
}

export const monitorDetailNavigatorParams = {
  id: syntheticsMonitorDetailLocatorID,
  getLocation: navigate,
};
