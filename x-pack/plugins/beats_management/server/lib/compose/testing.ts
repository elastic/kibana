/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';

import { HapiBackendFrameworkAdapter } from '../adapters/framework/hapi_framework_adapter';

import { CMBeatsDomain } from '../domains/beats';
import { CMTagsDomain } from '../domains/tags';
import { CMTokensDomain } from '../domains/tokens';

import { CMDomainLibs, CMServerLibs } from '../lib';

export function compose(server: any): CMServerLibs {
  const framework = new HapiBackendFrameworkAdapter(undefined, server);

  const tags = new CMTagsDomain(new MemoryTagsAdapter(server.tagsDB || []));
  const tokens = new CMTokensDomain(new MemoryTokensAdapter(server.tokensDB || []), {
    framework,
  });
  const beats = new CMBeatsDomain(new MemoryBeatsAdapter(server.beatsDB || []), {
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
    ...domainLibs,
  };

  return libs;
}
