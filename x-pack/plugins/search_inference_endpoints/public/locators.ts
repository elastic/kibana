/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

import { PLUGIN_ID } from '../common/constants';
import { SEARCH_INFERENCE_ENDPOINTS_PATH } from './routes';

export function registerLocators(share: SharePluginSetup) {
  share.url.locators.create<SerializableRecord>(new SearchInferenceEndpointLocatorDefinition());
}

class SearchInferenceEndpointLocatorDefinition implements LocatorDefinition<SerializableRecord> {
  public readonly getLocation = async () => {
    return {
      app: PLUGIN_ID,
      path: SEARCH_INFERENCE_ENDPOINTS_PATH,
      state: {},
    };
  };

  public readonly id = 'SEARCH_INFERENCE_ENDPOINTS';
}
