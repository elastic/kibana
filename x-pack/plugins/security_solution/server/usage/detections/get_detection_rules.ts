/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  SIGNALS_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import { ElasticsearchClient } from 'kibana/server';
import { fetchWithPit } from './fetch_with_pit';

import { RuleSearchResult } from './types';

export interface GetDetectionRulesOptions {
  esClient: ElasticsearchClient;
  kibanaIndex: string;
  maxSize: number;
  maxPerPage: number;
}

export const getDetectionRules = async ({
  esClient,
  kibanaIndex,
  maxSize,
  maxPerPage,
}: GetDetectionRulesOptions): Promise<Array<SearchHit<RuleSearchResult>>> => {
  return fetchWithPit<RuleSearchResult>({
    esClient,
    index: kibanaIndex,
    maxSize,
    maxPerPage,
    searchRequest: {
      query: {
        bool: {
          filter: {
            terms: {
              'alert.alertTypeId': [
                SIGNALS_ID,
                EQL_RULE_TYPE_ID,
                ML_RULE_TYPE_ID,
                QUERY_RULE_TYPE_ID,
                SAVED_QUERY_RULE_TYPE_ID,
                INDICATOR_RULE_TYPE_ID,
                THRESHOLD_RULE_TYPE_ID,
              ],
            },
          },
        },
      },
    },
  });
};
