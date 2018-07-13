/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';

import { TestingBackendFrameworkAdapter } from '../adapters/framework/testing_framework_adapter';

import { CMBeatsDomain } from '../domains/beats';
import { CMTagsDomain } from '../domains/tags';
import { CMTokensDomain } from '../domains/tokens';

import { BeatTag, CMBeat } from '../../../common/domain_types';
import { TokenEnrollmentData } from '../adapters/tokens/adapter_types';
import { CMDomainLibs, CMServerLibs } from '../lib';

export function compose({
  tagsDB = [],
  tokensDB = [],
  beatsDB = [],
}: {
  tagsDB?: BeatTag[];
  tokensDB?: TokenEnrollmentData[];
  beatsDB?: CMBeat[];
}): CMServerLibs {
  const framework = new TestingBackendFrameworkAdapter();

  const tags = new CMTagsDomain(new MemoryTagsAdapter(tagsDB));
  const tokens = new CMTokensDomain(new MemoryTokensAdapter(tokensDB), {
    framework,
  });
  const beats = new CMBeatsDomain(new MemoryBeatsAdapter(beatsDB), {
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
