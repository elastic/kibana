/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegistryDataStream } from '../../../types';

/**
 * Creates the base name for Elasticsearch assets in the form of
 * {type}-{dataset}
 */
export function getRegistryDataStreamAssetBaseName(dataStream: RegistryDataStream): string {
  return `${dataStream.type}-${dataStream.dataset}`;
}
