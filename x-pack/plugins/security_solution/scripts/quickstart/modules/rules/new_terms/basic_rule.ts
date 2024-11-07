/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { NewTermsRuleCreateProps } from '../../../../../common/api/detection_engine';
import { getEcsMapping, generateLargeMappingProperties, getSettings } from '../../mappings';

export const basicRule: NewTermsRuleCreateProps = {
  type: 'new_terms',
  description: 'test rule',
  name: 'test rule',
  risk_score: 20,
  severity: 'low',
  query: '*',
  new_terms_fields: ['host.name'],
  history_window_start: 'now-7d',
  enabled: false,
  index: ['test'],
};

/**
 * Create test data to trigger the new terms rule above.
 */
export const createData = async (client: Client) => {
  const index = 'test-index';
  const ecsMapping = getEcsMapping();
  await client.indices.create({
    index,
    mappings: {
      ...ecsMapping,
      properties: { ...ecsMapping.properties, ...generateLargeMappingProperties({ size: 100 }) },
    },
    settings: getSettings({ maxFields: 5000 }),
  });

  const now = new Date();
  const old = new Date(now);
  old.setDate(old.getDate() - 3);

  await client.bulk({
    index,
    operations: [
      { index: {} },
      {
        '@timestamp': now.toISOString(),
        'host.name': 'host-1',
      },
      { index: {} },
      {
        '@timestamp': old.toISOString(),
        'host.name': 'host-1',
      },
      { index: {} },
      {
        '@timestamp': now.toISOString(),
        'host.name': 'host-2',
      },
    ],
  });
};
