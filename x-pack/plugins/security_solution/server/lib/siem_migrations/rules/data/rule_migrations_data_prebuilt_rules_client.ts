/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { createPrebuiltRuleAssetsClient } from '../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import type { PrebuiltRuleQueryResponse } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

/* The minimum score required for a integration to be considered correct, might need to change this later */
const MIN_SCORE = 40 as const;
/* The number of integrations the RAG will return, sorted by score */
const RETURNED_RULES = 5 as const;
const BULK_MAX_SIZE = 500 as const;

interface RetrievePrebuiltRulesParams {
  soClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
}

interface FilteredRule {
  rule_id: string;
  name: string;
  description: string;
  elser_embedding: string;
}

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
export class RuleMigrationsDataPrebuiltRulesClient extends RuleMigrationsDataBaseClient {
  /** Indexes an array of integrations to be used with ELSER semantic search queries */
  async create({ soClient, rulesClient }: RetrievePrebuiltRulesParams): Promise<void> {
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const rules = await fetchRuleVersionsTriad({
      ruleAssetsClient,
      ruleObjectsClient,
    });

    const filteredRules: FilteredRule[] = [];
    rules.forEach((ruleVersions) => {
      const currentRule = ruleVersions.target || ruleVersions.current;
      if (currentRule) {
        const { rule_id, name, description } = currentRule;
        filteredRules.push({
          rule_id,
          name,
          description,
          elser_embedding: `${name} - ${description}`,
        });
      }
    });

    const index = await this.getIndexName();
    const createdAt = new Date().toISOString();
    let prebuiltRuleSlice: FilteredRule[];
    let currentLength = 0;
    const totalLength = filteredRules.length;
    while ((prebuiltRuleSlice = filteredRules.splice(0, BULK_MAX_SIZE)).length) {
      currentLength += prebuiltRuleSlice.length;
      this.logger.info(`Indexing ${currentLength}/${totalLength} prebuilt rules for ELSER`);
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: prebuiltRuleSlice.flatMap((prebuiltRule) => [
            { update: { _index: index, _id: prebuiltRule.rule_id } },
            {
              doc: {
                ...prebuiltRule,
                '@timestamp': createdAt,
              },
              doc_as_upsert: true,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(`Error indexing prebuilt rules for ELSER: ${error.message}`);
          throw error;
        });
    }
  }

  /** Based on a LLM generated semantic string, returns the 5 best results with a score above 40 */
  async retrieveRules(semanticString: string): Promise<PrebuiltRuleQueryResponse[]> {
    const index = await this.getIndexName();
    const query = {
      bool: {
        should: [
          {
            semantic: {
              query: semanticString,
              field: 'elser_embedding',
              boost: 1.5,
            },
          },
          {
            multi_match: {
              query: semanticString,
              fields: ['name^2', 'description'],
              boost: 3,
            },
          },
        ],
      },
    };
    const results = await this.esClient
      .search<PrebuiltRuleQueryResponse>({
        index,
        query,
        size: RETURNED_RULES,
        min_score: MIN_SCORE,
      })
      .then(this.processResponseHits.bind(this))
      .catch((error) => {
        this.logger.error(`Error querying prebuilt rule details for ELSER: ${error.message}`);
        throw error;
      });

    return results;
  }
}
