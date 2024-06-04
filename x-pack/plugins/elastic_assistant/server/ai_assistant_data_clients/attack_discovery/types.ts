/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Provider } from '@kbn/elastic-assistant-common';
import { EsReplacementSchema } from '../conversations/types';

export interface EsAttackDiscoverySchema {
  '@timestamp': string;
  id: string;
  created_at: string;
  namespace: string;
  attack_discoveries: Array<{
    alert_ids: string[];
    title: string;
    timestamp: string;
    details_markdown: string;
    entity_summary_markdown: string;
    mitre_attack_tactics?: string[];
    summary_markdown: string;
  }>;
  api_config?: {
    connector_id: string;
    action_type_id: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  replacements?: EsReplacementSchema[];
  updated_at?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
}

export interface CreateAttackDiscoverySchema {
  '@timestamp'?: string;
  created_at: string;
  id?: string | undefined;
  attack_discoveries: Array<{
    alert_ids: string[];
    title: string;
    timestamp: string;
    details_markdown: string;
    entity_summary_markdown: string;
    mitre_attack_tactics?: string[];
    summary_markdown: string;
  }>;
  api_config?: {
    action_type_id: string;
    connector_id: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  replacements?: EsReplacementSchema[];
  users: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  namespace: string;
}
