/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

export enum EntityType {
  SERVICE = 'service',
}

export interface EntityLatestServiceRaw {
  agent: {
    name: AgentName[];
  };
  source_data_stream: {
    type: string[];
  };
  service: {
    name: string;
    environment?: string;
  };
  entity: Entity;
}

interface Entity {
  id: string;
  last_seen_timestamp: string;
  identity_fields: string[];
}
