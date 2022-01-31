/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { Logger } from 'src/core/server';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

import { IRuleExecutionEventsReader } from '../rule_execution_events/events_reader';
import { IRuleExecutionInfoSavedObjectsClient } from '../rule_execution_info/saved_objects_client';
import { IRuleExecutionLogClient } from './client_interface';

const MAX_LAST_FAILURES = 5;

export const createRuleExecutionLogClient = (
  savedObjectsClient: IRuleExecutionInfoSavedObjectsClient,
  eventsReader: IRuleExecutionEventsReader,
  logger: Logger
): IRuleExecutionLogClient => {
  return {
    async getExecutionSummariesBulk(ruleIds) {
      const savedObjectsByRuleId = await savedObjectsClient.getManyByRuleIds(ruleIds);
      return mapValues(savedObjectsByRuleId, (so) => so?.attributes ?? null);
    },

    async getExecutionSummary(ruleId) {
      const savedObject = await savedObjectsClient.getOneByRuleId(ruleId);
      return savedObject ? savedObject.attributes : null;
    },

    async clearExecutionSummary(ruleId) {
      await savedObjectsClient.delete(ruleId);
    },

    getLastFailures(ruleId) {
      return eventsReader.getLastStatusChanges({
        ruleId,
        count: MAX_LAST_FAILURES,
        includeStatuses: [RuleExecutionStatus.failed],
      });
    },
  };
};
