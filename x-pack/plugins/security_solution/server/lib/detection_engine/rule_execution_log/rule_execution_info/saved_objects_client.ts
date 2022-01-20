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

import {
  RuleExecutionInfoSavedObject,
  RuleExecutionInfoAttributes,
  RULE_EXECUTION_INFO_TYPE,
} from './saved_object';
import {
  getRuleExecutionInfoId,
  getRuleExecutionInfoReferences,
  extractRuleIdFromReferences,
} from './saved_objects_utils';

import { ExtMeta } from '../utils/logging';
import { truncateList } from '../utils/normalization';

export interface IRuleExecutionInfoSavedObjectsClient {
  createOrUpdate(
    ruleId: string,
    attributes: RuleExecutionInfoAttributes
  ): Promise<RuleExecutionInfoSavedObject>;

  delete(ruleId: string): Promise<void>;

  getOneByRuleId(ruleId: string): Promise<RuleExecutionInfoSavedObject | null>;

  getManyByRuleIds(ruleIds: string[]): Promise<RuleExecutionInfoSavedObjectsByRuleId>;
}

export type RuleExecutionInfoSavedObjectsByRuleId = Record<
  string,
  RuleExecutionInfoSavedObject | null
>;

export const createRuleExecutionInfoSavedObjectsClient = (
  soClient: SavedObjectsClientContract,
  logger: Logger
): IRuleExecutionInfoSavedObjectsClient => {
  return {
    async createOrUpdate(ruleId, attributes) {
      try {
        const id = getRuleExecutionInfoId(ruleId);
        const references = getRuleExecutionInfoReferences(ruleId);

        return await soClient.create<RuleExecutionInfoAttributes>(
          RULE_EXECUTION_INFO_TYPE,
          attributes,
          {
            id,
            references,
            overwrite: true,
          }
        );
      } catch (e) {
        const logMessage = 'Error creating/updating rule execution info saved object';
        const logAttributes = `rule id: "${ruleId}"`;
        const logReason = e instanceof Error ? e.message : String(e);
        const logMeta: ExtMeta = {
          rule: { id: ruleId },
        };

        logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
        throw e;
      }
    },

    async delete(ruleId) {
      try {
        const id = getRuleExecutionInfoId(ruleId);
        await soClient.delete(RULE_EXECUTION_INFO_TYPE, id);
      } catch (e) {
        if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
          return;
        }

        const logMessage = 'Error deleting rule execution info saved object';
        const logAttributes = `rule id: "${ruleId}"`;
        const logReason = e instanceof Error ? e.message : String(e);
        const logMeta: ExtMeta = {
          rule: { id: ruleId },
        };

        logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
        throw e;
      }
    },

    async getOneByRuleId(ruleId) {
      try {
        const id = getRuleExecutionInfoId(ruleId);
        return await soClient.get<RuleExecutionInfoAttributes>(RULE_EXECUTION_INFO_TYPE, id);
      } catch (e) {
        if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
          return null;
        }

        const logMessage = 'Error fetching rule execution info saved object';
        const logAttributes = `rule id: "${ruleId}"`;
        const logReason = e instanceof Error ? e.message : String(e);
        const logMeta: ExtMeta = {
          rule: { id: ruleId },
        };

        logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
        throw e;
      }
    },

    async getManyByRuleIds(ruleIds) {
      try {
        const ids = ruleIds
          .map((id) => getRuleExecutionInfoId(id))
          .map((id) => ({ id, type: RULE_EXECUTION_INFO_TYPE }));

        const response = await soClient.bulkGet<RuleExecutionInfoAttributes>(ids);
        const result = prepopulateRuleExecutionInfoSavedObjectsByRuleId(ruleIds);

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
      } catch (e) {
        const ruleIdsString = `[${truncateList(ruleIds).join(', ')}]`;

        const logMessage = 'Error bulk fetching rule execution info saved objects';
        const logAttributes = `num of rules: ${ruleIds.length}, rule ids: ${ruleIdsString}`;
        const logReason = e instanceof Error ? e.message : String(e);

        logger.error(`${logMessage}; ${logAttributes}; ${logReason}`);
        throw e;
      }
    },
  };
};

const prepopulateRuleExecutionInfoSavedObjectsByRuleId = (ruleIds: string[]) => {
  const result: RuleExecutionInfoSavedObjectsByRuleId = {};
  ruleIds.forEach((ruleId) => {
    result[ruleId] = null;
  });
  return result;
};
