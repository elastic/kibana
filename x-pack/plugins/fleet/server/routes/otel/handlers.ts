/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { load } from 'js-yaml';

import type {
  FleetRequestHandler,
  OtelPolicySOAttributes,
  OtelIntegrationSOAttributes,
} from '../../types';
import type {
  CreateOtelPolicyRequestSchema,
  InstallOtelIntegrationRequestSchema,
} from '../../types/rest_spec/otel';
import { defaultFleetErrorHandler } from '../../errors';
import {
  OTEL_POLICY_SAVED_OBJECT_TYPE,
  OTEL_INTEGRATION_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import { agentPolicyService, appContextService } from '../../services';

export const createOtelPolicyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateOtelPolicyRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const coreContext = await context.core;
  const logger = appContextService.getLogger();
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const soClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const { id, ...newPolicy } = request.body;
  const policyId = id || uuidv4();

  try {
    const isoDate = new Date().toISOString();
    const newSo = await soClient.create<OtelPolicySOAttributes>(
      OTEL_POLICY_SAVED_OBJECT_TYPE,
      {
        ...newPolicy,
        revision: 1,
        created_at: isoDate,
        created_by: user?.username ?? 'system',
        updated_at: isoDate,
        updated_by: user?.username ?? 'system',
      },
      { id: policyId }
    );

    // bump agent policy revision
    for (const newPolicyId of newPolicy.policy_ids) {
      await agentPolicyService.bumpRevision(soClient, esClient, newPolicyId, {
        user,
      });
    }

    const createdPolicy = { id: newSo.id, version: newSo.version, ...newSo.attributes };
    logger.debug(`Created new otel policy with id ${newSo.id} and version ${newSo.version}`);

    return response.ok({
      body: {
        item: createdPolicy,
      },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const createOtelIntegrationPolicyHandler: FleetRequestHandler<
  TypeOf<typeof InstallOtelIntegrationRequestSchema.params>,
  undefined,
  TypeOf<typeof InstallOtelIntegrationRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const logger = appContextService.getLogger();

  const { name } = request.params;
  const jsonConfig = request?.body ? load(request.body) : {};

  try {
    const isoDate = new Date().toISOString();
    const template = {
      name,
      config: jsonConfig,
    };
    const newSo = await soClient.create<OtelIntegrationSOAttributes>(
      OTEL_INTEGRATION_SAVED_OBJECT_TYPE,
      {
        ...template,
        created_at: isoDate,
        created_by: user?.username ?? 'system',
        updated_at: isoDate,
        updated_by: user?.username ?? 'system',
      }
    );
    logger.debug(
      `Created new otel ${name} integration with id ${newSo.id} and version ${newSo.version}`
    );
    return response.ok({ body: { item: template } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
