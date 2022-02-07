/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../../../src/core/server';

import { withSecuritySpan } from '../../../../utils/with_security_span';

import {
  RuleExecutionSavedObject,
  RuleExecutionAttributes,
  RULE_EXECUTION_SO_TYPE,
} from './saved_objects_type';
import {
  getRuleExecutionSoId,
  getRuleExecutionSoReferences,
  extractRuleIdFromReferences,
} from './saved_objects_utils';

export interface IRuleExecutionSavedObjectsClient {
  createOrUpdate(
    ruleId: string,
    attributes: RuleExecutionAttributes
  ): Promise<RuleExecutionSavedObject>;

  delete(ruleId: string): Promise<void>;

  getOneByRuleId(ruleId: string): Promise<RuleExecutionSavedObject | null>;

  getManyByRuleIds(ruleIds: string[]): Promise<RuleExecutionSavedObjectsByRuleId>;
}

export type RuleExecutionSavedObjectsByRuleId = Record<string, RuleExecutionSavedObject | null>;

export const createRuleExecutionSavedObjectsClient = (
  soClient: SavedObjectsClientContract,
  logger: Logger
): IRuleExecutionSavedObjectsClient => {
  return {
    async createOrUpdate(ruleId, attributes) {
      const id = getRuleExecutionSoId(ruleId);
      const references = getRuleExecutionSoReferences(ruleId);

      const result = await withSecuritySpan('createOrUpdateRuleExecutionSO', () => {
        return soClient.create<RuleExecutionAttributes>(RULE_EXECUTION_SO_TYPE, attributes, {
          id,
          references,
          overwrite: true,
        });
      });

      return result;
    },

    async delete(ruleId) {
      try {
        const id = getRuleExecutionSoId(ruleId);
        await withSecuritySpan('deleteRuleExecutionSO', () => {
          return soClient.delete(RULE_EXECUTION_SO_TYPE, id);
        });
      } catch (e) {
        if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
          return;
        }
        throw e;
      }
    },

    async getOneByRuleId(ruleId) {
      try {
        const id = getRuleExecutionSoId(ruleId);
        return await withSecuritySpan('getRuleExecutionSO', () => {
          return soClient.get<RuleExecutionAttributes>(RULE_EXECUTION_SO_TYPE, id);
        });
      } catch (e) {
        if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
          return null;
        }
        throw e;
      }
    },

    async getManyByRuleIds(ruleIds) {
      const ids = ruleIds
        .map((id) => getRuleExecutionSoId(id))
        .map((id) => ({ id, type: RULE_EXECUTION_SO_TYPE }));

      const response = await withSecuritySpan('bulkGetRuleExecutionSOs', () => {
        return soClient.bulkGet<RuleExecutionAttributes>(ids);
      });

      const result = prepopulateRuleExecutionSavedObjectsByRuleId(ruleIds);

      response.saved_objects.forEach((so) => {
        // NOTE: We need to explicitly check that this saved object is not an error result and has references in it.
        // "Saved object" may not actually contain most of its properties (despite the fact that they are required
        // in its TypeScript interface), for example if it wasn't found. In this case it will look like that:
        // {
        //   id: '64b51590-a87e-5afc-9ede-906c3f3483b7',
        //   type: 'siem-detection-engine-rule-execution-info',
        //   error: {
        //     statusCode: 404,
        //     error: 'Not Found',
        //     message: 'Saved object [siem-detection-engine-rule-execution-info/64b51590-a87e-5afc-9ede-906c3f3483b7] not found'
        //   },
        //   namespaces: undefined
        // }
        const hasReferences = !so.error && so.references && Array.isArray(so.references);
        const references = hasReferences ? so.references : [];

        const ruleId = extractRuleIdFromReferences(references);
        if (ruleId) {
          result[ruleId] = so;
        }

        if (so.error && so.error.statusCode !== 404) {
          logger.error(so.error.message);
        }
      });

      return result;
    },
  };
};

const prepopulateRuleExecutionSavedObjectsByRuleId = (ruleIds: string[]) => {
  const result: RuleExecutionSavedObjectsByRuleId = {};
  ruleIds.forEach((ruleId) => {
    result[ruleId] = null;
  });
  return result;
};
