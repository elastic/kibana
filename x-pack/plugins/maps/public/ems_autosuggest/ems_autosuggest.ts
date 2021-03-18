/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../util';

export interface ISampleValuesConfig {
  emsLayerIds: string[];
  sampleValues: Array<string | number>;
  sampleValuesColumnName?: string;
}

export interface IEMSTermJoinConfig {
  layerId: string;
  field: string;
}

export async function suggestEMSTermJoinConfig(
  sampleValuesConfig: ISampleValuesConfig
): Promise<IEMSTermJoinConfig | null> {
  const emsFileLayers: FileLayer[] = await getEmsFileLayers();
  return {
    layerId: 'foo',
    field: 'bar',
  };
}
