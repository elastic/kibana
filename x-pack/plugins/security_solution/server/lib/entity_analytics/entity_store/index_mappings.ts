/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';

const BASE_ES_MAPPING: MappingTypeMapping['properties'] = {
  // TODO: do we need to add dynamic: 'strict' here eventually?
  // dynamic: 'strict',
  '@timestamp': {
    type: 'date',
  },
  'asset.criticality': {
    type: 'keyword',
  },
  'entity.name': {
    type: 'text',
    fields: {
      text: {
        type: 'keyword',
      },
    },
  },
  'entity.source': {
    type: 'keyword',
  },
};

const HOST_ES_MAPPING: MappingTypeMapping['properties'] = {
  'host.domain': {
    type: 'keyword',
  },
  'host.hostname': {
    type: 'keyword',
  },
  'host.id': {
    type: 'keyword',
  },
  'host.ip': {
    type: 'ip',
  },
  'host.mac': {
    type: 'keyword',
  },
  'host.name': {
    type: 'keyword',
  },
  'host.type': {
    type: 'keyword',
  },
  'host.architecture': {
    type: 'keyword',
  },
  'host.risk.calculated_level': {
    type: 'keyword',
  },
};

const USER_ES_MAPPING: MappingTypeMapping['properties'] = {
  'asset.criticality': {
    type: 'keyword',
  },
  'user.domain': {
    type: 'keyword',
  },
  'user.email': {
    type: 'keyword',
  },
  'user.full_name': {
    type: 'keyword',
  },
  'user.hash': {
    type: 'keyword',
  },
  'user.id': {
    type: 'keyword',
  },
  'user.name': {
    type: 'keyword',
  },
  'user.roles': {
    type: 'keyword',
  },
  'user.risk.calculated_level': {
    type: 'keyword',
  },
};

export const getEntityIndexMapping = (entityType: EntityType): MappingTypeMapping => {
  const entityMapping = entityType === 'host' ? HOST_ES_MAPPING : USER_ES_MAPPING;

  return {
    properties: {
      ...BASE_ES_MAPPING,
      ...entityMapping,
    },
  };
};
