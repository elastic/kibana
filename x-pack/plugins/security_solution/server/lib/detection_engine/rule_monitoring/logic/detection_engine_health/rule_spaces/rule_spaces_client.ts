/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../event_log/event_log_constants';
import { DETECTION_RULES_FILTER } from '../rule_objects/filters';
import { getSpacesAggregation, normalizeSpacesAggregation } from './aggregations/spaces';

/**
 * Client for getting information about Kibana spaces in the context of detection rules.
 */
export interface IRuleSpacesClient {
  /**
   * Returns id of the current Kibana space (associated with the current HTTP request).
   */
  getCurrentSpaceId(): string;

  /**
   * Returns ids of all Kibana spaces where at least one detection rule exists.
   */
  getAllSpaceIds(): Promise<string[]>;
}

export const createRuleSpacesClient = (
  currentSpaceId: string,
  internalSavedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): IRuleSpacesClient => {
  return {
    getCurrentSpaceId(): string {
      return currentSpaceId;
    },

    async getAllSpaceIds(): Promise<string[]> {
      const aggs = getSpacesAggregation();
      const response = await internalSavedObjectsClient.find<unknown, Record<string, unknown>>({
        type: RULE_SAVED_OBJECT_TYPE, // query rules
        filter: DETECTION_RULES_FILTER, // make sure to query only detection rules
        namespaces: ['*'], // aggregate rules in all Kibana spaces
        perPage: 0, // don't return rules in the response, we only need aggs
        aggs,
      });

      return normalizeSpacesAggregation(response.aggregations);
    },
  };
};
