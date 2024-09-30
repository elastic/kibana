/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldRetentionPipelineSteps } from './field_retention_enrich_policy';

describe('getFieldRetentionPipelineSteps', () => {
  it('should build a field retention ingest pipeline', () => {
    const processors = getFieldRetentionPipelineSteps({
      namespace: 'default',
      entityType: 'user',
      allEntityFields: [
        'asset.criticality',
        'user.domain',
        'user.email',
        'user.full_name',
        'user.hash',
        'user.id',
        'user.name',
        'user.roles',
        'user.risk.calculated_level',
      ],
    });

    const pipeline = {
      _meta: { managed_by: 'entity_store', managed: true },
      description: 'Ingest pipeline for entity defiinition ea_default_user_entity_store',
      processors,
    };

    console.log(JSON.stringify(pipeline));
  });
});
