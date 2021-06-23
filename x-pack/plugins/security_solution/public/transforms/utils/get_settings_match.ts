/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformConfigSchema } from '../../../common/transforms/types';

export const getSettingsMatch = ({
  indices,
  transformSettings,
}: {
  indices: string[];
  transformSettings: TransformConfigSchema;
}): TransformConfigSchema['settings'][0] | undefined => {
  const removeAllSubtractedIndices = indices.filter((index) => !index.startsWith('-')).sort();
  return transformSettings.settings.find((setting) => {
    const match = setting.data_sources.some((dataSource) => {
      return dataSource.sort().join() === removeAllSubtractedIndices.join();
    });
    if (match) {
      return setting;
    } else {
      return undefined;
    }
  });
};
