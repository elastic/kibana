/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { IEventLogClient, IEventLogService } from '../../../../../event_log/server';

import { IRuleExecutionLogClient } from './rule_execution_log_client/client_interface';
import { createRuleExecutionLogClient } from './rule_execution_log_client/client';
import { decorateRuleExecutionLogClient } from './rule_execution_log_client/decorator';

import {
  IRuleExecutionLogger,
  RuleExecutionContext,
} from './rule_execution_logger/logger_interface';
import { createRuleExecutionLogger } from './rule_execution_logger/logger';

import { createRuleExecutionEventsReader } from './rule_execution_events/events_reader';
import { createRuleExecutionEventsWriter } from './rule_execution_events/events_writer';
import { createRuleExecutionInfoSavedObjectsClient } from './rule_execution_info/saved_objects_client';

export type RuleExecutionLogClientFactory = (
  savedObjectsClient: SavedObjectsClientContract,
  eventLogClient: IEventLogClient,
  logger: Logger
) => IRuleExecutionLogClient;

export const ruleExecutionLogClientFactory: RuleExecutionLogClientFactory = (
  savedObjectsClient,
  eventLogClient,
  logger
) => {
  const soClient = createRuleExecutionInfoSavedObjectsClient(savedObjectsClient, logger);
  const eventsReader = createRuleExecutionEventsReader(eventLogClient, logger);
  const executionLogClient = createRuleExecutionLogClient(soClient, eventsReader, logger);
  return decorateRuleExecutionLogClient(executionLogClient, logger);
};

export type RuleExecutionLoggerFactory = (
  savedObjectsClient: SavedObjectsClientContract,
  eventLogService: IEventLogService,
  logger: Logger,
  context: RuleExecutionContext
) => IRuleExecutionLogger;

export const ruleExecutionLoggerFactory: RuleExecutionLoggerFactory = (
  savedObjectsClient,
  eventLogService,
  logger,
  context
) => {
  const soClient = createRuleExecutionInfoSavedObjectsClient(savedObjectsClient, logger);
  const eventsWriter = createRuleExecutionEventsWriter(eventLogService);
  return createRuleExecutionLogger(soClient, eventsWriter, logger, context);
};
