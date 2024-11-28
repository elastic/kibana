/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginSetup } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';

import {
  CreateIndexLocatorDefinition,
  type CreateIndexLocatorParams,
} from './create_index_locator';
import { SearchInferenceEndpointLocatorDefinition } from './inference_locator';
import { PlaygroundLocatorDefinition, type PlaygroundLocatorParams } from './playground_locator';

export function registerLocators(share: SharePluginSetup) {
  share.url.locators.create<CreateIndexLocatorParams>(new CreateIndexLocatorDefinition());
  share.url.locators.create<PlaygroundLocatorParams>(new PlaygroundLocatorDefinition());
  share.url.locators.create<SerializableRecord>(new SearchInferenceEndpointLocatorDefinition());
}
