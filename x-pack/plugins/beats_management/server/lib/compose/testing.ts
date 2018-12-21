/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';

import { HapiBackendFrameworkAdapter } from '../adapters/framework/hapi_framework_adapter';

import { CMBeatsDomain } from '../beats';
import { CMTagsDomain } from '../tags';
import { CMTokensDomain } from '../tokens';

import { BackendFrameworkLib } from '../framework';
import { CMServerLibs } from '../types';

export function compose(server: any): CMServerLibs {
  const framework = new BackendFrameworkLib(new HapiBackendFrameworkAdapter(undefined, server));

  const tags = new CMTagsDomain(new MemoryTagsAdapter(server.tagsDB || []));
  const tokens = new CMTokensDomain(new MemoryTokensAdapter(server.tokensDB || []), {
    framework,
  });
  const beats = new CMBeatsDomain(new MemoryBeatsAdapter(server.beatsDB || []), {
    tags,
    tokens,
    framework,
  });

  const libs: CMServerLibs = {
    framework,
    beats,
    tags,
    tokens,
  };

  return libs;
}
