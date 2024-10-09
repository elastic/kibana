/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type {
  MappingProperty,
  MappingPropertyBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IndexManagementPluginStart } from '@kbn/index-management-shared-types';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

export interface SearchIndicesPluginSetup {
  enabled: boolean;
  startAppId: string;
  startRoute: string;
}

export interface SearchIndicesPluginStart {
  enabled: boolean;
  startAppId: AppDeepLinkId;
  startRoute: string;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface SearchIndicesAppPluginStartDependencies {
  console?: ConsolePluginStart;
  cloud?: CloudStart;
  share: SharePluginStart;
  usageCollection?: UsageCollectionStart;
}

export interface SearchIndicesServicesContextDeps {
  history: AppMountParameters['history'];
  usageCollection?: UsageCollectionStart;
}
export type SearchIndicesServicesContext = CoreStart &
  SearchIndicesAppPluginStartDependencies & {
    history: AppMountParameters['history'];
    indexManagement: IndexManagementPluginStart;
  };

export interface AppUsageTracker {
  click: (eventName: string | string[]) => void;
  count: (eventName: string | string[]) => void;
  load: (eventName: string | string[]) => void;
}

export interface Mappings {
  mappings: {
    properties: MappingPropertyBase['properties'];
  };
}

export interface CodeSnippetParameters {
  indexName?: string;
  apiKey?: string;
  elasticsearchURL: string;
}

export type CodeSnippetFunction = (params: CodeSnippetParameters) => string;

export interface CodeLanguage {
  id: string;
  title: string;
  icon: string;
  codeBlockLanguage: string;
}

export interface CreateIndexCodeDefinition {
  installCommand?: string;
  createIndex: CodeSnippetFunction;
}

export interface CreateIndexCodeExamples {
  exampleType: string;
  sense: CreateIndexCodeDefinition;
  curl: CreateIndexCodeDefinition;
  python: CreateIndexCodeDefinition;
  javascript: CreateIndexCodeDefinition;
}

export interface IngestCodeSnippetParameters extends CodeSnippetParameters {
  indexName: string;
  sampleDocument: object;
  mappingProperties: Record<string, MappingProperty>;
}

export type IngestCodeSnippetFunction = (params: IngestCodeSnippetParameters) => string;

export interface IngestDataCodeDefinition {
  installCommand?: string;
  ingestCommand: IngestCodeSnippetFunction;
  updateMappingsCommand: IngestCodeSnippetFunction;
}

export interface IngestDataCodeExamples {
  title: string;
  ingestTitle: string;
  description: string;
  defaultMapping: Record<string, MappingProperty>;
  sense: IngestDataCodeDefinition;
  curl: IngestDataCodeDefinition;
  python: IngestDataCodeDefinition;
  javascript: IngestDataCodeDefinition;
}
