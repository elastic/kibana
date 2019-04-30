/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { MemoryConfigurationBlockAdapter } from '../adapters/configuration_blocks/memory_tags_adapter';
import { HapiBackendFrameworkAdapter } from '../adapters/framework/hapi_framework_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';
import { BeatEventsLib } from '../beat_events';
import { CMBeatsDomain } from '../beats';
import { ConfigurationBlocksLib } from '../configuration_blocks';
import { BackendFrameworkLib } from '../framework';
import { CMTagsDomain } from '../tags';
import { CMTokensDomain } from '../tokens';
import { CMServerLibs } from '../types';

export function compose(server: any): CMServerLibs {
  const framework = new BackendFrameworkLib(new HapiBackendFrameworkAdapter(undefined, server));

  const beatsAdapter = new MemoryBeatsAdapter(server.beatsDB || []);
  const configAdapter = new MemoryConfigurationBlockAdapter(server.configsDB || []);
  const tags = new CMTagsDomain(
    new MemoryTagsAdapter(server.tagsDB || []),
    configAdapter,
    beatsAdapter
  );
  const configurationBlocks = new ConfigurationBlocksLib(configAdapter, tags);
  const tokens = new CMTokensDomain(new MemoryTokensAdapter(server.tokensDB || []), {
    framework,
  });
  const beats = new CMBeatsDomain(beatsAdapter, {
    tags,
    tokens,
    framework,
  });
  const beatEvents = new BeatEventsLib({} as any, beats);

  const libs: CMServerLibs = {
    beatEvents,
    framework,
    beats,
    tags,
    tokens,
    configurationBlocks,
  };

  return libs;
}
