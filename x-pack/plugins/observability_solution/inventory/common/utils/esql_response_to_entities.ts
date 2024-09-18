/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSearchResponse } from '@kbn/es-types';
import { Entity } from '../entities';
import { esqlResultToPlainObjects } from './esql_result_to_plain_objects';

export function esqlResponseToEntities(response: ESQLSearchResponse): Entity[] {
  return esqlResultToPlainObjects(response).map((obj) => {
    return {
      type: obj['entity.type'],
      displayName: obj['entity.displayName'],
      properties: obj,
    };
  });
}
