/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../common/constants';

export const useEntityModel = () => {
  console.log('Initializing entity model');

  const http = useKibana().services.http;

  const initialize = () => {
    if (!http) return;

    http
      .fetch('/internal/api/entities/definition', {
        version: '1',
        method: 'POST',
        body: JSON.stringify(entityDefinition),
      })
      .then((response) => {
        console.log(response);
      });
  };

  return { initialize };
};

const entityDefinition = {
  id: 'secsol-ea-entity-store',
  name: 'EA store',
  type: 'node',
  indexPatterns: [RISK_SCORE_INDEX_PATTERN, ASSET_CRITICALITY_INDEX_PATTERN],
  filter: '@timestamp >= now-5m',
  lookback: '5m',
  identityFields: [
    { field: 'user.name', optional: true },
    { field: 'id_value', optional: true },
  ],
  displayNameTemplate: '{{user.name}}',
  metadata: ['user.risk.calculated_level', 'user.risk.calculated_score_norm', 'criticality_level'],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
};
