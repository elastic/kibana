/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import type { RequestHandler } from '../../../../../../src/core/server';
import { appContextService, packagePolicyService } from '../../services';
import type {
  GetPackagePoliciesRequestSchema,
  GetOnePackagePolicyRequestSchema,
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  UpgradePackagePoliciesRequestSchema,
  DryRunPackagePoliciesRequestSchema,
  FleetRequestHandler,
} from '../../types';
import type {
  CreatePackagePolicyResponse,
  DeletePackagePoliciesResponse,
  NewPackagePolicy,
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../common';
import { defaultIngestErrorHandler } from '../../errors';

export const getPackagePoliciesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetPackagePoliciesRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { items, total, page, perPage } = await packagePolicyService.list(
      soClient,
      request.query
    );
    return response.ok({
      body: {
        items,
        total,
        page,
        perPage,
      },
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getOnePackagePolicyHandler: RequestHandler<
  TypeOf<typeof GetOnePackagePolicyRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const { packagePolicyId } = request.params;
  const notFoundResponse = () =>
    response.notFound({ body: { message: `Package policy ${packagePolicyId} not found` } });

  try {
    const packagePolicy = await packagePolicyService.get(soClient, packagePolicyId);
    if (packagePolicy) {
      return response.ok({
        body: {
          item: packagePolicy,
        },
      });
    } else {
      return notFoundResponse();
    }
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return notFoundResponse();
    } else {
      return defaultIngestErrorHandler({ error, response });
    }
  }
};

export const createPackagePolicyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.fleet.epm.internalSoClient;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const { force, ...newPolicy } = request.body;
  const spaceId = context.fleet.spaceId;
  try {
    const newPackagePolicy = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
      soClient,
      newPolicy as NewPackagePolicy
    );

    const newData = await packagePolicyService.runExternalCallbacks(
      'packagePolicyCreate',
      newPackagePolicy,
      context,
      request
    );

    // Create package policy
    const packagePolicy = await packagePolicyService.create(soClient, esClient, newData, {
      user,
      force,
      spaceId,
    });
    const body: CreatePackagePolicyResponse = { item: packagePolicy };
    return response.ok({
      body,
    });
  } catch (error) {
    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    return defaultIngestErrorHandler({ error, response });
  }
};

export const updatePackagePolicyHandler: RequestHandler<
  TypeOf<typeof UpdatePackagePolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const packagePolicy = await packagePolicyService.get(soClient, request.params.packagePolicyId);

  if (!packagePolicy) {
    throw Boom.notFound('Package policy not found');
  }

  const { force, ...body } = request.body;
  // removed fields not recognized by schema
  const packagePolicyInputs = packagePolicy.inputs.map((input) => {
    const newInput = {
      ...input,
      streams: input.streams.map((stream) => {
        const newStream = { ...stream };
        delete newStream.compiled_stream;
        return newStream;
      }),
    };
    delete newInput.compiled_input;
    return newInput;
  });
  // listing down accepted properties, because loaded packagePolicy contains some that are not accepted in update
  let newData = {
    ...body,
    name: body.name ?? packagePolicy.name,
    description: body.description ?? packagePolicy.description,
    namespace: body.namespace ?? packagePolicy.namespace,
    policy_id: body.policy_id ?? packagePolicy.policy_id,
    enabled: body.enabled ?? packagePolicy.enabled,
    output_id: body.output_id ?? packagePolicy.output_id,
    package: body.package ?? packagePolicy.package,
    inputs: body.inputs ?? packagePolicyInputs,
    vars: body.vars ?? packagePolicy.vars,
  } as NewPackagePolicy;

  try {
    newData = await packagePolicyService.runExternalCallbacks(
      'packagePolicyUpdate',
      newData,
      context,
      request
    );

    const updatedPackagePolicy = await packagePolicyService.update(
      soClient,
      esClient,
      request.params.packagePolicyId,
      newData,
      { user, force },
      packagePolicy.package?.version
    );
    return response.ok({
      body: { item: updatedPackagePolicy },
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deletePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeletePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  try {
    const body: DeletePackagePoliciesResponse = await packagePolicyService.delete(
      soClient,
      esClient,
      request.body.packagePolicyIds,
      { user, force: request.body.force }
    );
    try {
      await packagePolicyService.runExternalCallbacks(
        'postPackagePolicyDelete',
        body,
        context,
        request
      );
    } catch (error) {
      const logger = appContextService.getLogger();
      logger.error(`An error occurred executing external callback: ${error}`);
      logger.error(error);
    }
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const upgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof UpgradePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  try {
    const body: UpgradePackagePolicyResponse = await packagePolicyService.upgrade(
      soClient,
      esClient,
      request.body.packagePolicyIds,
      { user }
    );

    const firstFatalError = body.find((item) => item.statusCode && item.statusCode !== 200);

    if (firstFatalError) {
      return response.customError({
        statusCode: firstFatalError.statusCode!,
        body: { message: firstFatalError.body!.message },
      });
    }
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const dryRunUpgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DryRunPackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const body: UpgradePackagePolicyDryRunResponse = [];
    const { packagePolicyIds } = request.body;

    for (const id of packagePolicyIds) {
      const result = await packagePolicyService.getUpgradeDryRunDiff(soClient, id);
      body.push(result);
    }

    const firstFatalError = body.find((item) => item.statusCode && item.statusCode !== 200);

    if (firstFatalError) {
      return response.customError({
        statusCode: firstFatalError.statusCode!,
        body: { message: firstFatalError.body!.message },
      });
    }

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
