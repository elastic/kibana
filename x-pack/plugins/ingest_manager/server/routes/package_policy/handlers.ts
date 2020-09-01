/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import Boom from 'boom';
import { RequestHandler, SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { appContextService, packagePolicyService } from '../../services';
import { getPackageInfo } from '../../services/epm/packages';
import {
  GetPackagePoliciesRequestSchema,
  GetOnePackagePolicyRequestSchema,
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  NewPackagePolicy,
} from '../../types';
import { CreatePackagePolicyResponse, DeletePackagePoliciesResponse } from '../../../common';

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
        success: true,
      },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getOnePackagePolicyHandler: RequestHandler<TypeOf<
  typeof GetOnePackagePolicyRequestSchema.params
>> = async (context, request, response) => {
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
          success: true,
        },
      });
    } else {
      return notFoundResponse();
    }
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return notFoundResponse();
    } else {
      return response.customError({
        statusCode: 500,
        body: { message: e.message },
      });
    }
  }
};

export const createPackagePolicyHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const logger = appContextService.getLogger();
  let newData = { ...request.body };
  try {
    // If we have external callbacks, then process those now before creating the actual package policy
    const externalCallbacks = appContextService.getExternalCallbacks('packagePolicyCreate');
    if (externalCallbacks && externalCallbacks.size > 0) {
      let updatedNewData: NewPackagePolicy = newData;

      for (const callback of externalCallbacks) {
        try {
          // ensure that the returned value by the callback passes schema validation
          updatedNewData = CreatePackagePolicyRequestSchema.body.validate(
            await callback(updatedNewData)
          );
        } catch (error) {
          // Log the error, but keep going and process the other callbacks
          logger.error(
            'An external registered [packagePolicyCreate] callback failed when executed'
          );
          logger.error(error);
        }
      }

      newData = updatedNewData;
    }

    // Create package policy
    const packagePolicy = await packagePolicyService.create(soClient, callCluster, newData, {
      user,
    });
    const body: CreatePackagePolicyResponse = { item: packagePolicy, success: true };
    return response.ok({
      body,
    });
  } catch (e) {
    logger.error(e);
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const updatePackagePolicyHandler: RequestHandler<
  TypeOf<typeof UpdatePackagePolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const packagePolicy = await packagePolicyService.get(soClient, request.params.packagePolicyId);

    if (!packagePolicy) {
      throw Boom.notFound('Package policy not found');
    }

    const newData = { ...request.body };
    const pkg = newData.package || packagePolicy.package;
    const inputs = newData.inputs || packagePolicy.inputs;
    if (pkg && (newData.inputs || newData.package)) {
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
      });
      newData.inputs = (await packagePolicyService.assignPackageStream(pkgInfo, inputs)) as TypeOf<
        typeof CreatePackagePolicyRequestSchema.body
      >['inputs'];
    }

    const updatedPackagePolicy = await packagePolicyService.update(
      soClient,
      request.params.packagePolicyId,
      newData,
      { user }
    );
    return response.ok({
      body: { item: updatedPackagePolicy, success: true },
    });
  } catch (e) {
    return response.customError({
      statusCode: e.statusCode || 500,
      body: { message: e.message },
    });
  }
};

export const deletePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeletePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  try {
    const body: DeletePackagePoliciesResponse = await packagePolicyService.delete(
      soClient,
      request.body.packagePolicyIds,
      { user }
    );
    return response.ok({
      body,
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
