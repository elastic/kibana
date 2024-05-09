/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetService } from '../services/types';

export function getServiceNamesPerSignalType(serviceAssets: AssetService[]) {
  const tracesServiceNames = serviceAssets
    .filter(({ asset }) => asset.signalTypes['asset.traces'])
    .map(({ service }) => service.name);

  const logsServiceNames = serviceAssets
    .filter(({ asset }) => asset.signalTypes['asset.logs'])
    .map(({ service }) => service.name);

  return { tracesServiceNames, logsServiceNames };
}
