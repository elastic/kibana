/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetService, SignalType } from '../services/types';

export function getServiceNamesPerSignalType(serviceAssets: AssetService[]) {
  const tracesServiceNames = serviceAssets
    .filter(({ asset }) => asset.signalTypes[SignalType.ASSET_TRACES])
    .map(({ service }) => service.name);

  const logsServiceNames = serviceAssets
    .filter(({ asset }) => asset.signalTypes[SignalType.ASSET_LOGS])
    .map(({ service }) => service.name);

  return { tracesServiceNames, logsServiceNames };
}
