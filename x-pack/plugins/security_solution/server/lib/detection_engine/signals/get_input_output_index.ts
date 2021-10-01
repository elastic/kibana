/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_INDEX_KEY,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INDEX_PATTERN_EXPERIMENTAL,
} from '../../../../common/constants';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerting/server';
import { ExperimentalFeatures } from '../../../../common/experimental_features';

export interface GetInputIndex {
  experimentalFeatures: ExperimentalFeatures;
  index: string[] | null | undefined;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
}

export const getInputIndex = async ({
  experimentalFeatures,
  index,
  services,
  version,
}: GetInputIndex): Promise<string[]> => {
  if (index != null) {
    return index;
  } else {
    const configuration = await services.savedObjectsClient.get<{
      'securitySolution:defaultIndex': string[];
    }>('config', version);
    if (configuration.attributes != null && configuration.attributes[DEFAULT_INDEX_KEY] != null) {
      return configuration.attributes[DEFAULT_INDEX_KEY];
    } else {
      return experimentalFeatures.uebaEnabled
        ? [...DEFAULT_INDEX_PATTERN, ...DEFAULT_INDEX_PATTERN_EXPERIMENTAL]
        : DEFAULT_INDEX_PATTERN;
    }
  }
};
