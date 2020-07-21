/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dataset } from '../../../types';

/**
 * Creates the base name for Elasticsearch assets in the form of
 * {type}-{id}
 */
export function getDatasetAssetBaseName(dataset: Dataset): string {
  return `${dataset.type}-${dataset.name}`;
}
