/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { HttpStart } from '@kbn/core-http-browser';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export * from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface AppServicesContext {
  security: SecurityPluginStart;
  http: HttpStart;
}

export enum ChatFormFields {
  question = 'question',
  citations = 'citations',
  prompt = 'prompt',
  openAIKey = 'api_key',
  indices = 'indices',
  elasticsearchQuery = 'elasticsearch_query',
  summarizationModel = 'summarization_model',
}

export interface ChatForm {
  [ChatFormFields.question]: string;
  [ChatFormFields.prompt]: string;
  [ChatFormFields.citations]: boolean;
  [ChatFormFields.openAIKey]: string;
  [ChatFormFields.indices]: string[];
  [ChatFormFields.summarizationModel]: string;
  [ChatFormFields.elasticsearchQuery]: QueryDslQueryContainer;
}
