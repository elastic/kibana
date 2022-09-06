/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { i18n } from '@kbn/i18n';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { Logger } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { EventFilters } from '../types';

const PROCESS_INTERACTIVE_ECS_FIELD = 'process.entry_leader.interactive';

/**
 * Check if Event Filter list exists and Create Event Filters for the Elastic Defend integration.
 */
export const createEventFilters = async (
  logger: Logger,
  exceptionsClient: ExceptionListClient,
  eventFilters: EventFilters,
  packagePolicy: PackagePolicy
) => {
  const exceptionList = await exceptionsClient.getExceptionList({
    id: undefined,
    listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
    namespaceType: 'agnostic',
  });

  if (exceptionList == null) {
    logger.error(
      `Error: Exception List not found: ${ENDPOINT_EVENT_FILTERS_LIST_ID}. Event Filter not created.`
    );
  } else if (eventFilters.nonInteractiveSession) {
    createNonInteractiveSessionEventFilter(logger, exceptionsClient, packagePolicy);
  }
};

/**
 * Create an Event Filter for non-interactive sessions and attach it to the policy
 */
export const createNonInteractiveSessionEventFilter = (
  logger: Logger,
  exceptionsClient: ExceptionListClient,
  packagePolicy: PackagePolicy
) => {
  try {
    exceptionsClient.createExceptionListItem({
      listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
      description: i18n.translate(
        'xpack.securitySolution.fleetIntegration.elasticDefend.eventFilter.nonInteractiveSessions.description',
        {
          defaultMessage: 'Event filter for Cloud Security. Created by Elastic Defend integration.',
        }
      ),
      name: i18n.translate(
        'xpack.securitySolution.fleetIntegration.elasticDefend.eventFilter.nonInteractiveSessions.name',
        {
          defaultMessage: 'Non-interactive Sessions',
        }
      ),
      // Attach to the created policy
      tags: [`policy:${packagePolicy.id}`],
      osTypes: ['linux'],
      type: 'simple',
      namespaceType: 'agnostic',
      entries: [
        {
          field: PROCESS_INTERACTIVE_ECS_FIELD,
          operator: 'included',
          type: 'match',
          value: 'false',
        },
      ],
      itemId: uuid.v4(),
      meta: [],
      comments: [],
    });
  } catch (err) {
    logger.error(`Error: ${err.message}`);
  }
};
