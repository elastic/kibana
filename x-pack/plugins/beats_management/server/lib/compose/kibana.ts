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
import { FrameworkLib } from './../framework';

import { CMBeatsDomain } from '../beats';
import { CMTagsDomain } from '../tags';
import { CMTokensDomain } from '../tokens';

import { PLUGIN } from 'x-pack/plugins/beats_management/common/constants';
import { CMServerLibs } from '../types';

export function compose(server: any): CMServerLibs {
  const database = new KibanaDatabaseAdapter(server.plugins.elasticsearch);
  const framework = new FrameworkLib(new KibanaBackendFrameworkAdapter(PLUGIN.ID, server));

  const tags = new CMTagsDomain(new ElasticsearchTagsAdapter(database));
  const tokens = new CMTokensDomain(new ElasticsearchTokensAdapter(database), {
    framework,
  });
  const beats = new CMBeatsDomain(new ElasticsearchBeatsAdapter(database), {
    tags,
    tokens,
    framework,
  });

  const libs: CMServerLibs = {
    framework,
    database,
    beats,
    tags,
    tokens,
  };

  return libs;
}
