/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchBeatsAdapter } from '../adapters/beats/elasticsearch_beats_adapter';
import { ElasticsearchTagsAdapter } from '../adapters/tags/elasticsearch_tags_adapter';
import { ElasticsearchTokensAdapter } from '../adapters/tokens/elasticsearch_tokens_adapter';

import { KibanaBackendFrameworkAdapter } from '../adapters/famework/kibana/kibana_framework_adapter';

import { CMBeatsDomain } from '../domains/beats';
import { CMTagsDomain } from '../domains/tags';
import { CMTokensDomain } from '../domains/tokens';

import { CMDomainLibs, CMServerLibs } from '../lib';

import { Server } from 'hapi';

export function compose(server: Server): CMServerLibs {
  const framework = new KibanaBackendFrameworkAdapter(server);

  const tags = new CMTagsDomain(new ElasticsearchTagsAdapter(framework));
  const tokens = new CMTokensDomain(new ElasticsearchTokensAdapter(framework), {
    framework,
  });
  const beats = new CMBeatsDomain(new ElasticsearchBeatsAdapter(framework), {
    tags,
    tokens,
  });

  const domainLibs: CMDomainLibs = {
    beats,
    tags,
    tokens,
  };

  const libs: CMServerLibs = {
    framework,
    ...domainLibs,
  };

  return libs;
}
