/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import type { ElasticsearchServiceStart, Logger } from 'src/core/server';
import { SecurityPluginSetup } from '../../../../security/server';
import { LicensingPluginStart } from '../../../../licensing/server';
import { PLUGIN } from '../../../common/constants';
import { BeatsManagementConfigType } from '../../../common';
import { ElasticsearchBeatsAdapter } from '../adapters/beats/elasticsearch_beats_adapter';
import { ElasticsearchConfigurationBlockAdapter } from '../adapters/configuration_blocks/elasticsearch_configuration_block_adapter';
import { KibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { KibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { ElasticsearchTagsAdapter } from '../adapters/tags/elasticsearch_tags_adapter';
import { ElasticsearchTokensAdapter } from '../adapters/tokens/elasticsearch_tokens_adapter';
import { BeatEventsLib } from '../beat_events';
import { CMBeatsDomain } from '../beats';
import { ConfigurationBlocksLib } from '../configuration_blocks';
import { CMTagsDomain } from '../tags';
import { CMTokensDomain } from '../tokens';
import { CMServerLibs } from '../types';
import { BackendFrameworkLib } from './../framework';

interface ComposeOptions {
  elasticsearch: ElasticsearchServiceStart;
  licensing: LicensingPluginStart;
  security?: SecurityPluginSetup;
  config: BeatsManagementConfigType;
  logger: Logger;
  kibanaVersion: string;
}

export function compose({
  elasticsearch,
  config,
  kibanaVersion,
  logger,
  licensing,
  security,
}: ComposeOptions): CMServerLibs {
  const backendAdapter = new KibanaBackendFrameworkAdapter(
    camelCase(PLUGIN.ID),
    kibanaVersion,
    config,
    logger,
    licensing,
    security
  );
  const framework = new BackendFrameworkLib(backendAdapter, config);
  const database = new KibanaDatabaseAdapter(elasticsearch);
  const beatsAdapter = new ElasticsearchBeatsAdapter(database);
  const configAdapter = new ElasticsearchConfigurationBlockAdapter(database);

  const tags = new CMTagsDomain(
    new ElasticsearchTagsAdapter(database),
    configAdapter,
    beatsAdapter
  );
  const configurationBlocks = new ConfigurationBlocksLib(configAdapter, tags);
  const tokens = new CMTokensDomain(new ElasticsearchTokensAdapter(database), {
    framework,
  });
  const beats = new CMBeatsDomain(beatsAdapter, {
    tags,
    tokens,
    framework,
  });
  const beatEvents = new BeatEventsLib(beats);

  const libs: CMServerLibs = {
    beatEvents,
    framework,
    database,
    beats,
    tags,
    tokens,
    configurationBlocks,
  };

  return libs;
}
