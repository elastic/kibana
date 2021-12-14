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
} from '../../types';
import type {
  CreatePackagePolicyResponse,
  DeletePackagePoliciesResponse,
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

export const createPackagePolicyHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const { force, ...newPolicy } = request.body;
  try {
    const newData = await packagePolicyService.runExternalCallbacks(
      'packagePolicyCreate',
      newPolicy,
      context,
      request
    );

    // Create package policy
    const packagePolicy = await packagePolicyService.create(soClient, esClient, newData, {
      user,
      force,
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
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const packagePolicy = await packagePolicyService.get(soClient, request.params.packagePolicyId);

  if (!packagePolicy) {
    throw Boom.notFound('Package policy not found');
  }

  let newData = { ...request.body };
  const pkg = newData.package || packagePolicy.package;
  const inputs = newData.inputs || packagePolicy.inputs;

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
      { ...newData, package: pkg, inputs },
      { user }
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
  const esClient = context.core.elasticsearch.client.asCurrentUser;
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

// TODO: Separate the upgrade and dry-run processes into separate endpoints, and address
// duplicate logic in error handling as part of https://github.com/elastic/kibana/issues/63123
export const upgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof UpgradePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  try {
    if (request.body.dryRun) {
      const body: UpgradePackagePolicyDryRunResponse = [];

      for (const id of request.body.packagePolicyIds) {
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
    } else {
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
    }
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
