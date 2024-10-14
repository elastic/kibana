/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import type { RetrieveDocumentationAPI } from './tasks/retrieve_documentation';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface PluginSetupDependencies {}

export interface PluginStartDependencies {
  inference: InferenceServerStart;
  productDocBase: ProductDocBaseStartContract;
}

export interface LlmTasksPluginSetup {}

export interface LlmTasksPluginStart {
  retrieveDocumentationAvailable: () => Promise<boolean>;
  retrieveDocumentation: RetrieveDocumentationAPI;
}
