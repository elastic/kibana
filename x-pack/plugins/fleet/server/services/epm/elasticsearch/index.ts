/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryDataStream } from '../../../types';

/**
 * Creates the base name for Elasticsearch assets in the form of
 * {type}-{dataset}
 */
export function getRegistryDataStreamAssetBaseName(dataStream: RegistryDataStream): string {
  const baseName = `${dataStream.type}-${dataStream.dataset}`;
  return dataStream.hidden ? `.${baseName}` : baseName;
}
