/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ConnectorMappings } from '../../../common/api';

export interface ConnectorMappingsPersistedAttributes {
  mappings: Array<{
    action_type: string;
    source: string;
    target: string;
  }>;
  owner: string;
}

export type ConnectorMappingsTransformed = ConnectorMappings;
export type ConnectorMappingsSavedObjectTransformed = SavedObject<ConnectorMappingsTransformed>;
