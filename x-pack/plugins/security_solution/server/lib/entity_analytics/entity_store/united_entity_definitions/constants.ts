/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import {
  HOST_DEFINITION_VERSION,
  UNIVERSAL_DEFINITION_VERSION,
  USER_DEFINITION_VERSION,
} from './entity_types';
import type { MappingProperties } from './types';

export const BASE_ENTITY_INDEX_MAPPING: MappingProperties = {
  '@timestamp': {
    type: 'date',
  },
  'asset.criticality': {
    type: 'keyword',
  },
  'entity.name': {
    type: 'keyword',
    fields: {
      text: {
        type: 'match_only_text',
      },
    },
  },
  'entity.source': {
    type: 'keyword',
  },
};

export const VERSIONS_BY_ENTITY_TYPE: Record<EntityType, string> = {
  host: HOST_DEFINITION_VERSION,
  user: USER_DEFINITION_VERSION,
  universal: UNIVERSAL_DEFINITION_VERSION,
};
