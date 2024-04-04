/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { SettingsConfig } from './types';

export const AGENT_POLICY_ADVANCED_SETTINGS: SettingsConfig[] = [
  {
    name: 'agent.limits.go_max_procs',
    title: 'GO_MAX_PROCS',
    description: 'Limits the maximum number of CPUs that can be executing simultaneously',
    learnMoreLink: 'https://docs.elastic.co/...',
    api_field: {
      name: 'agent_limits_go_max_procs',
    },
    schema: z.number().int().min(0).default(0),
  },
  {
    name: 'agent.download.timeout',
    title: 'Agent binary download timeout',
    description: 'Timeout in seconds for downloading the agent binary',
    learnMoreLink: 'https://docs.elastic.co/...',
    api_field: {
      name: 'agent_download_timeout',
    },
    schema: z.number().int().min(0).default(0),
  },
  {
    name: 'agent.download.path',
    api_field: {
      name: 'agent_download_path',
    },
    title: 'Agent binary download path',
    description: 'The disk path to which the agent binary will be downloaded the agent binary',
    learnMoreLink: 'https://docs.elastic.co/...',
    schema: z.string(),
  },
];
