/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RequestHandler } from '@kbn/core/server';

import { groupBy, keyBy } from 'lodash';

import { populatePackagePolicyAssignedAgentsCount } from '../../services/package_policies/populate_package_policy_assigned_agents_count';

import {
  agentPolicyService,
  appContextService,
  checkAllowedPackages,
  packagePolicyService,
} from '../../services';
import type {
  GetPackagePoliciesRequestSchema,
  GetOnePackagePolicyRequestSchema,
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  UpgradePackagePoliciesRequestSchema,
  DryRunPackagePoliciesRequestSchema,
  FleetRequestHandler,
  PackagePolicy,
  DeleteOnePackagePolicyRequestSchema,
  BulkGetPackagePoliciesRequestSchema,
} from '../../types';
import type {
  BulkGetPackagePoliciesResponse,
  CreatePackagePolicyResponse,
  PostDeletePackagePoliciesResponse,
  NewPackagePolicy,
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../common/types';
import { installationStatuses } from '../../../common/constants';
import { defaultFleetErrorHandler, PackagePolicyNotFoundError } from '../../errors';
import { getInstallations, getPackageInfo } from '../../services/epm/packages';
import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import { simplifiedPackagePolicytoNewPackagePolicy } from '../../../common/services/simplified_package_policy_helper';

import type { SimplifiedPackagePolicy } from '../../../common/services/simplified_package_policy_helper';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

export const getPackagePoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetPackagePoliciesRequestSchema.query>
> = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;

  try {
    const { items, total, page, perPage } = await packagePolicyService.list(
      soClient,
      request.query
    );

    checkAllowedPackages(items, limitedToPackages, 'package.name');

    if (request.query.withAgentCount) {
      await populatePackagePolicyAssignedAgentsCount(esClient, items);
    }

    // agnostic to package-level RBAC
    return response.ok({
      body: {
        items,
        total,
        page,
        perPage,
      },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const bulkGetPackagePoliciesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkGetPackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;
  const { ids, ignoreMissing } = request.body;

  try {
    const items = await packagePolicyService.getByIDs(soClient, ids, {
      ignoreMissing,
    });

    const body: BulkGetPackagePoliciesResponse = { items: items ?? [] };

    checkAllowedPackages(body.items, limitedToPackages, 'package.name');

    return response.ok({
      body,
    });
  } catch (error) {
    if (error instanceof PackagePolicyNotFoundError) {
      return response.notFound({
        body: { message: error.message },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const getOnePackagePolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetOnePackagePolicyRequestSchema.params>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;
  const { packagePolicyId } = request.params;
  const notFoundResponse = () =>
    response.notFound({ body: { message: `Package policy ${packagePolicyId} not found` } });

  try {
    const packagePolicy = await packagePolicyService.get(soClient, packagePolicyId);

    if (packagePolicy) {
      checkAllowedPackages([packagePolicy], limitedToPackages, 'package.name');

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
      return defaultFleetErrorHandler({ error, response });
    }
  }
};

export const getOrphanedPackagePolicies: RequestHandler<undefined, undefined> = async (
  context,
  request,
  response
) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const installedPackages = await getInstallations(soClient, {
      perPage: SO_SEARCH_LIMIT,
      filter: `
        ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:${installationStatuses.Installed}
    `,
    });
    const orphanedPackagePolicies: PackagePolicy[] = [];
    const packagePolicies = await packagePolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
    });
    const packagePoliciesByPackage = groupBy(packagePolicies.items, 'package.name');
    const agentPolicies = await agentPolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
    });
    const agentPoliciesById = keyBy(agentPolicies.items, 'id');
    const usedPackages = installedPackages.saved_objects.filter(
      ({ attributes: { name } }) => !!packagePoliciesByPackage[name]
    );
    usedPackages.forEach(({ attributes: { name } }) => {
      packagePoliciesByPackage[name].forEach((packagePolicy) => {
        if (!agentPoliciesById[packagePolicy.policy_id]) {
          orphanedPackagePolicies.push(packagePolicy);
        }
      });
    });

    return response.ok({
      body: {
        items: orphanedPackagePolicies,
        total: orphanedPackagePolicies.length,
      },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

function isSimplifiedCreatePackagePolicyRequest(
  body: Omit<TypeOf<typeof CreatePackagePolicyRequestSchema.body>, 'force' | 'package'>
): body is SimplifiedPackagePolicy {
  // If `inputs` is not defined or if it's a non-array, the request body is using the new simplified API
  if (body.inputs && Array.isArray(body.inputs)) {
    return false;
  }

  return true;
}

export const createPackagePolicyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const { force, package: pkg, ...newPolicy } = request.body;
  if ('output_id' in newPolicy) {
    // TODO Remove deprecated APIs https://github.com/elastic/kibana/issues/121485
    delete newPolicy.output_id;
  }
  const spaceId = fleetContext.spaceId;
  try {
    let newPackagePolicy: NewPackagePolicy;
    if (isSimplifiedCreatePackagePolicyRequest(newPolicy)) {
      if (!pkg) {
        throw new Error('Package is required');
      }
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        ignoreUnverified: force,
        prerelease: true,
      });
      newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(newPolicy, pkgInfo, {
        experimental_data_stream_features: pkg.experimental_data_stream_features,
      });
    } else {
      newPackagePolicy = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(soClient, {
        ...newPolicy,
        package: pkg,
      } as NewPackagePolicy);
    }

    const newData = await packagePolicyService.runExternalCallbacks(
      'packagePolicyCreate',
      newPackagePolicy,
      context,
      request
    );

    // Create package policy
    const packagePolicy = await fleetContext.packagePolicyService.asCurrentUser.create(
      soClient,
      esClient,
      newData,
      {
        user,
        force,
        spaceId,
      }
    );

    const enrichedPackagePolicy = await packagePolicyService.runExternalCallbacks(
      'packagePolicyPostCreate',
      packagePolicy,
      context,
      request
    );

    const body: CreatePackagePolicyResponse = { item: enrichedPackagePolicy };

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
    return defaultFleetErrorHandler({ error, response });
  }
};

export const updatePackagePolicyHandler: FleetRequestHandler<
  TypeOf<typeof UpdatePackagePolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const packagePolicy = await packagePolicyService.get(soClient, request.params.packagePolicyId);

  if (!packagePolicy) {
    throw Boom.notFound('Package policy not found');
  }

  if (limitedToPackages && limitedToPackages.length) {
    const packageName = packagePolicy?.package?.name;
    if (packageName && !limitedToPackages.includes(packageName)) {
      return response.forbidden({
        body: { message: `Update for package name ${packageName} is not authorized.` },
      });
    }
  }

  try {
    const { force, package: pkg, ...body } = request.body;
    // TODO Remove deprecated APIs https://github.com/elastic/kibana/issues/121485
    if ('output_id' in body) {
      delete body.output_id;
    }

    let newData: NewPackagePolicy;

    if (
      body.inputs &&
      isSimplifiedCreatePackagePolicyRequest(body as unknown as SimplifiedPackagePolicy)
    ) {
      if (!pkg) {
        throw new Error('package is required');
      }
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
      });
      newData = simplifiedPackagePolicytoNewPackagePolicy(
        body as unknown as SimplifiedPackagePolicy,
        pkgInfo,
        { experimental_data_stream_features: pkg.experimental_data_stream_features }
      );
    } else {
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
      newData = {
        ...body,
        name: body.name ?? packagePolicy.name,
        description: body.description ?? packagePolicy.description,
        namespace: body.namespace ?? packagePolicy.namespace,
        policy_id: body.policy_id ?? packagePolicy.policy_id,
        enabled: 'enabled' in body ? body.enabled ?? packagePolicy.enabled : packagePolicy.enabled,
        package: pkg ?? packagePolicy.package,
        inputs: body.inputs ?? packagePolicyInputs,
        vars: body.vars ?? packagePolicy.vars,
      } as NewPackagePolicy;
    }
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
    return defaultFleetErrorHandler({ error, response });
  }
};

export const deletePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeletePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const logger = appContextService.getLogger();

  try {
    try {
      const packagePolicies = await packagePolicyService.getByIDs(
        soClient,
        request.body.packagePolicyIds,
        { ignoreMissing: true }
      );

      if (packagePolicies) {
        await packagePolicyService.runExternalCallbacks(
          'packagePolicyDelete',
          packagePolicies,
          context,
          request
        );
      }
    } catch (error) {
      logger.error(`An error occurred executing external callback: ${error}`);
      logger.error(error);
    }

    const body: PostDeletePackagePoliciesResponse = await packagePolicyService.delete(
      soClient,
      esClient,
      request.body.packagePolicyIds,
      { user, force: request.body.force, skipUnassignFromAgentPolicies: request.body.force }
    );
    try {
      await packagePolicyService.runExternalCallbacks(
        'packagePolicyPostDelete',
        body,
        context,
        request
      );
    } catch (error) {
      logger.error(`An error occurred executing external callback: ${error}`);
      logger.error(error);
    }
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const deleteOnePackagePolicyHandler: RequestHandler<
  TypeOf<typeof DeleteOnePackagePolicyRequestSchema.params>,
  TypeOf<typeof DeleteOnePackagePolicyRequestSchema.query>,
  unknown
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurity()?.authc.getCurrentUser(request) || undefined;
  const logger = appContextService.getLogger();

  try {
    try {
      const packagePolicy = await packagePolicyService.get(
        soClient,
        request.params.packagePolicyId
      );
      await packagePolicyService.runExternalCallbacks(
        'packagePolicyDelete',
        packagePolicy ? [packagePolicy] : [],
        context,
        request
      );
    } catch (error) {
      logger.error(`An error occurred executing external callback: ${error}`);
      logger.error(error);
    }

    const res = await packagePolicyService.delete(
      soClient,
      esClient,
      [request.params.packagePolicyId],
      { user, force: request.query.force, skipUnassignFromAgentPolicies: request.query.force }
    );

    if (
      res[0] &&
      res[0].success === false &&
      res[0].statusCode !== 404 // ignore 404 to allow that call to be idempotent
    ) {
      return response.customError({
        statusCode: res[0].statusCode ?? 500,
        body: res[0].body,
      });
    }
    try {
      await packagePolicyService.runExternalCallbacks(
        'packagePolicyPostDelete',
        res,
        context,
        request
      );
    } catch (error) {
      logger.error(`An error occurred executing external callback: ${error}`);
      logger.error(error);
    }
    return response.ok({
      body: { id: request.params.packagePolicyId },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const upgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof UpgradePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
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
    return defaultFleetErrorHandler({ error, response });
  }
};

export const dryRunUpgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DryRunPackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
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
    return defaultFleetErrorHandler({ error, response });
  }
};
