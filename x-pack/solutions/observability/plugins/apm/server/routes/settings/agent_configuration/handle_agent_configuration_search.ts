/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import type { AgentConfigSearchParams } from './route';
import { searchConfigurations } from './search_configurations';
import { markError } from './mark_error';
import { markAppliedByAgent } from './mark_applied_by_agent';

export async function handleAgentConfigurationSearch({
  params,
  internalESClient,
  logger,
}: {
  params: AgentConfigSearchParams;
  internalESClient: APMInternalESClient;
  logger: Logger;
}) {
  const { service, etag, mark_as_applied_by_agent: markAsAppliedByAgent, error } = params;
  const configuration = await searchConfigurations({
    service,
    internalESClient,
  });

  if (!configuration) {
    logger.debug(
      `[Central configuration] Config was not found for ${service.name}/${service.environment}`
    );
    return null;
  }

  if (error?.trim()) {
    await markError({
      id: configuration._id!,
      body: configuration._source,
      error,
      internalESClient,
    });
    return configuration;
  }

  // whether to update `applied_by_agent` field
  // It will be set to true of the etags match or if `markAsAppliedByAgent=true`
  // `markAsAppliedByAgent=true` means "force setting it to true regardless of etag". This is needed for Jaeger agent that doesn't have etags
  const willMarkAsApplied =
    (markAsAppliedByAgent || etag === configuration._source.etag) &&
    !configuration._source.applied_by_agent;

  logger.debug(
    `[Central configuration] Config was found for:
        service.name = ${service.name},
        service.environment = ${service.environment},
        etag (requested) = ${etag},
        etag (existing) = ${configuration._source.etag},
        markAsAppliedByAgent = ${markAsAppliedByAgent},
        willMarkAsApplied = ${willMarkAsApplied}`
  );

  if (willMarkAsApplied) {
    await markAppliedByAgent({
      id: configuration._id!,
      body: configuration._source,
      internalESClient,
    });
  }

  return configuration;
}
