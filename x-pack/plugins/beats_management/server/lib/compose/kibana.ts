/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchBeatsAdapter } from '../adapters/beats/elasticsearch_beats_adapter';
import { KibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { ElasticsearchTagsAdapter } from '../adapters/tags/elasticsearch_tags_adapter';
import { ElasticsearchTokensAdapter } from '../adapters/tokens/elasticsearch_tokens_adapter';

import { KibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';

import { CMBeatsDomain } from '../domains/beats';
import { CMTagsDomain } from '../domains/tags';
import { CMTokensDomain } from '../domains/tokens';

import { CMDomainLibs, CMServerLibs } from '../lib';

export function compose(server: any): CMServerLibs {
  const framework = new KibanaBackendFrameworkAdapter(server);
  const database = new KibanaDatabaseAdapter(server.plugins.elasticsearch);

  const tags = new CMTagsDomain(new ElasticsearchTagsAdapter(database));
  const tokens = new CMTokensDomain(new ElasticsearchTokensAdapter(database, framework), {
    framework,
  });
  const beats = new CMBeatsDomain(new ElasticsearchBeatsAdapter(database), {
    tags,
    tokens,
    framework,
  });

  const domainLibs: CMDomainLibs = {
    beats,
    tags,
    tokens,
  };

  const libs: CMServerLibs = {
    framework,
    database,
    ...domainLibs,
  };

  return libs;
}
