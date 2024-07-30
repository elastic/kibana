/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';
import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  DEFAULT_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../common/constants';

export const ENTITY_DEFINITION_ID = 'secsol-ea-entity-store';

export const useEntityModel = () => {
  const http = useKibana().services.http;

  const initialize = useCallback(() => {
    if (!http) return Promise.resolve();

    return http.fetch('/internal/entities/definition', {
      version: '1',
      method: 'POST',
      headers: {
        'elastic-api-version': 1,
      },
      body: JSON.stringify(entityDefinition),
    });
  }, [http]);

  const get = useCallback(() => {
    if (!http) return Promise.resolve([]);

    return http.fetch('/internal/entities/definition', {
      version: '1',
      method: 'GET',
      query: {
        id: ENTITY_DEFINITION_ID,
      },
    });
  }, [http]);

  const deleteAPI = useCallback(() => {
    if (!http) return Promise.resolve([]);

    return http.fetch(`/internal/entities/definition/${ENTITY_DEFINITION_ID}`, {
      version: '1',
      method: 'DELETE',
    });
  }, [http]);

  return { initialize, get, deleteAPI };
};

const entityDefinition = {
  id: ENTITY_DEFINITION_ID,
  name: 'EA store',
  type: 'node',
  indexPatterns: [
    RISK_SCORE_INDEX_PATTERN,
    ASSET_CRITICALITY_INDEX_PATTERN,
    ...DEFAULT_INDEX_PATTERN,
  ],
  filter: '@timestamp >= now-5m',
  lookback: '5m',
  identityFields: [
    { field: 'user.name', optional: true },
    { field: 'id_value', optional: true },
    { field: 'asset.type', optional: true },
    { field: 'labels.identity_source', optional: true },
  ],
  displayNameTemplate: '{{user.name}}{{id_value}}',
  metadata: [
    'user.risk.calculated_level',
    'user.risk.calculated_score_norm',
    'user.email',
    'criticality_level',
    'asset.type',
    'labels.identity_source',
    { source: '_index', destination: 'sourceIndex' },
  ],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
  version: '1.0.0',
};
