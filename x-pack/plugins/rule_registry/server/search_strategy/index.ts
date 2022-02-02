/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map } from 'rxjs/operators';
import { ValidFeatureId, isValidFeatureId } from '@kbn/rule-data-utils';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import { ISearchStrategy, PluginStart } from '../../../../../src/plugins/data/server';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '../../common/search_strategy';
import { IRuleDataService } from '..';
import { Dataset } from '../rule_data_plugin_service/index_options';

export const ruleRegistrySearchStrategyProvider = (
  data: PluginStart,
  ruleDataService: IRuleDataService
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  const spaceId = null;

  return {
    search: (request, options, deps) => {
      if (!isValidFeatureId(request.featureId)) {
        throw new Error('this is no good');
      }

      const indices = ruleDataService
        .findIndicesByFeature(request.featureId, Dataset.alerts)
        .map((indexInfo) => {
          return request.featureId === 'siem'
            ? `${indexInfo.baseName}-${spaceId}*`
            : `${indexInfo.baseName}*`;
        });
      const params = {
        index: indices,
        body: {
          query: {
            match_all: {},
          },
        },
      };
      return es.search({ ...request, params }, options, deps).pipe(
        map((response) => {
          return response;
        })
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
