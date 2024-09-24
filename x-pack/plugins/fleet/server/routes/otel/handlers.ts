/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';

import type { FleetRequestHandler, OtelPolicySOAttributes } from '../../types';
import type { CreateOtelPolicyRequestSchema } from '../../types/rest_spec/otel';
import { defaultFleetErrorHandler } from '../../errors';
import { OTEL_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { appContextService } from '../../services';

export const createOtelPolicyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateOtelPolicyRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;

  const logger = appContextService.getLogger();
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const soClient = fleetContext.internalSoClient;
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

    // if (options?.bumpRevision ?? true) {
    //   for (const policyId of newPolicy.policy_ids) {
    //     await agentPolicyService.bumpRevision(soClient, esClient, policyId, {
    //       user: options?.user,
    //     });
    //   }
    // }

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
