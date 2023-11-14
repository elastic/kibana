/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core/server';

import { CspRuleTemplate } from '../../common/schemas';
import { CspRuleTemplateState } from '../../common/schemas/csp_rule_template_state';
import {
  CSP_RULE_TEMPLATE_INTERNAL_SAVED_OBJECT_TYPE,
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
} from '../../common/constants';

export const synchronizeCspRuleTemplatesState = async (
  soClient: SavedObjectsClientContract,
  internalSoClient: ISavedObjectsRepository,
  logger: Logger
) => {
  try {
    const newCspRules = await fetchNewCspRules(soClient);
    const existingCspRulesState = await fetchExistingCspRulesState(internalSoClient);
    const bulkCreateObjects = createBulkCreateObjects(newCspRules, existingCspRulesState);

    await internalSoClient.bulkCreate(bulkCreateObjects);
    logger.info('Synchronization CSP rules state completed successfully.');
  } catch (e) {
    logger.error(`Error during CSP rule template synchronization: ${e.message}`);
    const retrySuccessful = await retryBulkCreate(soClient, internalSoClient, logger);

    if (!retrySuccessful) {
      return false;
    }
  }
};

const fetchNewCspRules = async (soClient: SavedObjectsClientContract) => {
  return soClient.find<CspRuleTemplate>({
    type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    perPage: 10000, // max value
  });
};

const fetchExistingCspRulesState = async (internalSoClient: ISavedObjectsRepository) => {
  return internalSoClient.find<CspRuleTemplateState>({
    type: CSP_RULE_TEMPLATE_INTERNAL_SAVED_OBJECT_TYPE,
    perPage: 10000, // max value
  });
};

const createBulkCreateObjects = (newCspRules: any, existingCspRulesState: any) => {
  return newCspRules.saved_objects.map((newCspRule: any) => {
    const existingObject = existingCspRulesState.saved_objects.find(
      (existingCspRuleState: any) =>
        existingCspRuleState.attributes.id === newCspRule.attributes.metadata.id
    );
    const enabled = existingObject ? existingObject.attributes.enabled : true;

    return {
      type: CSP_RULE_TEMPLATE_INTERNAL_SAVED_OBJECT_TYPE,
      id: newCspRule.attributes.metadata.id,
      attributes: { enabled },
    };
  });
};

const retryBulkCreate = async (
  soClient: SavedObjectsClientContract,
  internalSoClient: ISavedObjectsRepository,
  logger: Logger
) => {
  try {
    logger.warn('Retrying bulkCreate with enable=true for all CSP rule templates...');
    const newCspRules = await fetchNewCspRules(soClient);
    const bulkCreateRetryObjects = createBulkCreateObjectsWithEnableTrue(newCspRules);

    await internalSoClient.bulkCreate(bulkCreateRetryObjects);
    logger.info('Retry bulkCreate completed successfully.');
    return true;
  } catch (retryError) {
    logger.error(`Error during retry bulkCreate: ${retryError.message}`);
    return false;
  }
};

const createBulkCreateObjectsWithEnableTrue = (newCspRules: any) => {
  return newCspRules.saved_objects.map((newCspRule: any) => ({
    type: CSP_RULE_TEMPLATE_INTERNAL_SAVED_OBJECT_TYPE,
    id: newCspRule.attributes.metadata.id,
    attributes: { enabled: true },
  }));
};
