/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { management } from 'ui/management';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import routes from 'ui/routes';
// @ts-ignore: path dynamic for kibana
import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';

import { BeatsLib } from '../beats';
import { FrontendDomainLibs, FrontendLibs } from '../lib';

import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import { supportedConfigs } from '../../config_schemas';
import { TagsLib } from '../tags';
import { MemoryElasticsearchAdapter } from './../adapters/elasticsearch/memory';
import { ElasticsearchLib } from './../elasticsearch';

export function compose(
  mockIsKueryValid: (kuery: string) => boolean,
  mockKueryToEsQuery: (kuery: string) => string,
  suggestions: AutocompleteSuggestion[]
): FrontendLibs {
  const esAdapter = new MemoryElasticsearchAdapter(
    mockIsKueryValid,
    mockKueryToEsQuery,
    suggestions
  );
  const tags = new TagsLib(new MemoryTagsAdapter([]), supportedConfigs);
  const tokens = new MemoryTokensAdapter();
  const beats = new BeatsLib(new MemoryBeatsAdapter([]), { tags });

  const domainLibs: FrontendDomainLibs = {
    tags,
    tokens,
    beats,
  };
  const pluginUIModule = uiModules.get('app/beats_management');

  const framework = new KibanaFrameworkAdapter(pluginUIModule, management, routes, null, null);
  const libs: FrontendLibs = {
    ...domainLibs,
    elasticsearch: new ElasticsearchLib(esAdapter),
    framework,
  };
  return libs;
}
