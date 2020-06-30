/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LayerConfig, YConfig } from './types';

export const getColor = (layer: LayerConfig, accessor: string) => {
  if (layer.splitAccessor) {
    return null;
  }
  return (
    layer?.yConfig?.find((yConfig: YConfig) => yConfig.forAccessor === accessor)?.color || null
  );
};
