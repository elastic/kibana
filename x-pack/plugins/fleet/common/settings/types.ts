/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from 'zod';

export type SettingsSection = 'AGENT_POLICY_ADVANCED_SETTINGS';

export interface SettingsConfig {
  name: string;
  title: string;
  description: string;
  learnMoreLink?: string;
  schema: z.ZodTypeAny;
  api_field: {
    name: string;
  };
}
