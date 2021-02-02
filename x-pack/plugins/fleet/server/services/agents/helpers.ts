/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { Agent, AgentSOAttributes } from '../../types';

export function searchHitToAgent(hit: ESSearchHit<AgentSOAttributes>): Agent {
  return {
    id: hit._id,
    ...hit._source,
    current_error_events: hit._source.current_error_events
      ? JSON.parse(hit._source.current_error_events)
      : [],
    access_api_key: undefined,
    status: undefined,
    packages: hit._source.packages ?? [],
  };
}
