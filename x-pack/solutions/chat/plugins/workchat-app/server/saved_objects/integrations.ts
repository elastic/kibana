/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { IntegrationType, IntegrationConfiguration } from '@kbn/wci-common';

export const integrationTypeName = 'workchat_integration' as const;

export const integrationSoType: SavedObjectsType<IntegrationAttributes> = {
  name: integrationTypeName,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: 'strict',
    properties: {
      integration_id: { type: 'keyword' },
      type: { type: 'keyword' },
      name: { type: 'keyword' },
      description: { type: 'text' },
      configuration: { dynamic: false, type: 'object', properties: {} },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      created_by: { type: 'keyword' },
    },
  },
};

export interface IntegrationAttributes {
  integration_id: string;
  type: IntegrationType;
  name: string;
  description: string;
  configuration: IntegrationConfiguration;
  created_at: string;
  updated_at: string;
  created_by: string;
}
