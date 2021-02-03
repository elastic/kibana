/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';

export const getInputIndex = async (
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>,
  version: string,
  inputIndex: string[] | null | undefined
): Promise<string[]> => {
  if (inputIndex != null) {
    return inputIndex;
  } else {
    const configuration = await services.savedObjectsClient.get<{
      'securitySolution:defaultIndex': string[];
    }>('config', version);
    if (configuration.attributes != null && configuration.attributes[DEFAULT_INDEX_KEY] != null) {
      return configuration.attributes[DEFAULT_INDEX_KEY];
    } else {
      return DEFAULT_INDEX_PATTERN;
    }
  }
};
