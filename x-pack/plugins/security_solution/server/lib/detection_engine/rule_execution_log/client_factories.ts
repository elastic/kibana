/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { IEventLogClient, IEventLogService } from '@kbn/event-log-plugin/server';

import { IRuleExecutionLogForRoutes } from './client_for_routes/client_interface';
import { createClientForRoutes } from './client_for_routes/client';

import {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
} from './client_for_executors/client_interface';
import { createClientForExecutors } from './client_for_executors/client';

import { createEventLogReader } from './event_log/event_log_reader';
import { createEventLogWriter } from './event_log/event_log_writer';
import { createRuleExecutionSavedObjectsClient } from './execution_saved_object/saved_objects_client';

export type RuleExecutionLogForRoutesFactory = (
  savedObjectsClient: SavedObjectsClientContract,
  eventLogClient: IEventLogClient,
  logger: Logger
) => IRuleExecutionLogForRoutes;

export const ruleExecutionLogForRoutesFactory: RuleExecutionLogForRoutesFactory = (
  savedObjectsClient,
  eventLogClient,
  logger
) => {
  const soClient = createRuleExecutionSavedObjectsClient(savedObjectsClient, logger);
  const eventLogReader = createEventLogReader(eventLogClient);
  return createClientForRoutes(soClient, eventLogReader, logger);
};

export type RuleExecutionLogForExecutorsFactory = (
  savedObjectsClient: SavedObjectsClientContract,
  eventLogService: IEventLogService,
  logger: Logger,
  context: RuleExecutionContext
) => IRuleExecutionLogForExecutors;

export const ruleExecutionLogForExecutorsFactory: RuleExecutionLogForExecutorsFactory = (
  savedObjectsClient,
  eventLogService,
  logger,
  context
) => {
  const soClient = createRuleExecutionSavedObjectsClient(savedObjectsClient, logger);
  const eventLogWriter = createEventLogWriter(eventLogService);
  return createClientForExecutors(soClient, eventLogWriter, logger, context);
};
