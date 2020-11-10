/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'src/core/server';
import uuid from 'uuid';
import { AuthenticatedUser } from '../../../security/server';
import {
  DeletePackagePoliciesResponse,
  PackagePolicyInput,
  NewPackagePolicyInput,
  PackagePolicyInputStream,
  PackageInfo,
  ListWithKuery,
  packageToPackagePolicy,
  isPackageLimited,
  doesAgentPolicyAlreadyIncludePackage,
} from '../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import {
  NewPackagePolicy,
  UpdatePackagePolicy,
  PackagePolicy,
  PackagePolicySOAttributes,
  RegistryPackage,
  CallESAsCurrentUser,
} from '../types';
import { agentPolicyService } from './agent_policy';
import { outputService } from './output';
import * as Registry from './epm/registry';
import { getPackageInfo, getInstallation, ensureInstalledPackage } from './epm/packages';
import { getAssetsData } from './epm/packages/assets';
import { createStream } from './epm/agent/agent';
import { normalizeKuery } from './saved_object';

const SAVED_OBJECT_TYPE = PACKAGE_POLICY_SAVED_OBJECT_TYPE;

function getDataset(st: string) {
  return st.split('.')[1];
}

class PackagePolicyService {
  public async create(
    soClient: SavedObjectsClientContract,
    callCluster: CallESAsCurrentUser,
    packagePolicy: NewPackagePolicy,
    options?: { id?: string; user?: AuthenticatedUser; bumpRevision?: boolean }
  ): Promise<PackagePolicy> {
    // Check that its agent policy does not have a package policy with the same name
    const parentAgentPolicy = await agentPolicyService.get(soClient, packagePolicy.policy_id);
    if (!parentAgentPolicy) {
      throw new Error('Agent policy not found');
    } else {
      if (
        (parentAgentPolicy.package_policies as PackagePolicy[]).find(
          (siblingPackagePolicy) => siblingPackagePolicy.name === packagePolicy.name
        )
      ) {
        throw new Error('There is already a package with the same name on this agent policy');
      }
    }
    // Add ids to stream
    const packagePolicyId = options?.id || uuid.v4();
    let inputs = packagePolicy.inputs.map((input) =>
      assignIdsToInputAndStream(packagePolicyId, input)
    );

    // Make sure the associated package is installed
    if (packagePolicy.package?.name) {
      const [, pkgInfo] = await Promise.all([
        ensureInstalledPackage({
          savedObjectsClient: soClient,
          pkgName: packagePolicy.package.name,
          callCluster,
        }),
        getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: packagePolicy.package.name,
          pkgVersion: packagePolicy.package.version,
        }),
      ]);

      // Check if it is a limited package, and if so, check that the corresponding agent policy does not
      // already contain a package policy for this package
      if (isPackageLimited(pkgInfo)) {
        const agentPolicy = await agentPolicyService.get(soClient, packagePolicy.policy_id, true);
        if (agentPolicy && doesAgentPolicyAlreadyIncludePackage(agentPolicy, pkgInfo.name)) {
          throw new Error(
            `Unable to create package policy. Package '${pkgInfo.name}' already exists on this agent policy.`
          );
        }
      }

      inputs = await this.assignPackageStream(pkgInfo, inputs);
    }

    const isoDate = new Date().toISOString();
    const newSo = await soClient.create<PackagePolicySOAttributes>(
      SAVED_OBJECT_TYPE,
      {
        ...packagePolicy,
        inputs,
        revision: 1,
        created_at: isoDate,
        created_by: options?.user?.username ?? 'system',
        updated_at: isoDate,
        updated_by: options?.user?.username ?? 'system',
      },

      { ...options, id: packagePolicyId }
    );

    // Assign it to the given agent policy
    await agentPolicyService.assignPackagePolicies(soClient, packagePolicy.policy_id, [newSo.id], {
      user: options?.user,
      bumpRevision: options?.bumpRevision ?? true,
    });

    return {
      id: newSo.id,
      version: newSo.version,
      ...newSo.attributes,
    };
  }

  public async bulkCreate(
    soClient: SavedObjectsClientContract,
    packagePolicies: NewPackagePolicy[],
    agentPolicyId: string,
    options?: { user?: AuthenticatedUser; bumpRevision?: boolean }
  ): Promise<PackagePolicy[]> {
    const isoDate = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { saved_objects } = await soClient.bulkCreate<PackagePolicySOAttributes>(
      packagePolicies.map((packagePolicy) => {
        const packagePolicyId = uuid.v4();

        const inputs = packagePolicy.inputs.map((input) =>
          assignIdsToInputAndStream(packagePolicyId, input)
        );

        return {
          type: SAVED_OBJECT_TYPE,
          id: packagePolicyId,
          attributes: {
            ...packagePolicy,
            inputs,
            policy_id: agentPolicyId,
            revision: 1,
            created_at: isoDate,
            created_by: options?.user?.username ?? 'system',
            updated_at: isoDate,
            updated_by: options?.user?.username ?? 'system',
          },
        };
      })
    );

    // Filter out invalid SOs
    const newSos = saved_objects.filter((so) => !so.error && so.attributes);

    // Assign it to the given agent policy
    await agentPolicyService.assignPackagePolicies(
      soClient,
      agentPolicyId,
      newSos.map((newSo) => newSo.id),
      {
        user: options?.user,
        bumpRevision: options?.bumpRevision ?? true,
      }
    );

    return newSos.map((newSo) => ({
      id: newSo.id,
      version: newSo.version,
      ...newSo.attributes,
    }));
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<PackagePolicy | null> {
    const packagePolicySO = await soClient.get<PackagePolicySOAttributes>(SAVED_OBJECT_TYPE, id);
    if (!packagePolicySO) {
      return null;
    }

    if (packagePolicySO.error) {
      throw new Error(packagePolicySO.error.message);
    }

    return {
      id: packagePolicySO.id,
      version: packagePolicySO.version,
      ...packagePolicySO.attributes,
    };
  }

  public async getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[]
  ): Promise<PackagePolicy[] | null> {
    const packagePolicySO = await soClient.bulkGet<PackagePolicySOAttributes>(
      ids.map((id) => ({
        id,
        type: SAVED_OBJECT_TYPE,
      }))
    );
    if (!packagePolicySO) {
      return null;
    }

    return packagePolicySO.saved_objects.map((so) => ({
      id: so.id,
      version: so.version,
      ...so.attributes,
    }));
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<{ items: PackagePolicy[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, sortField = 'updated_at', sortOrder = 'desc', kuery } = options;

    const packagePolicies = await soClient.find<PackagePolicySOAttributes>({
      type: SAVED_OBJECT_TYPE,
      sortField,
      sortOrder,
      page,
      perPage,
      filter: kuery ? normalizeKuery(SAVED_OBJECT_TYPE, kuery) : undefined,
    });

    return {
      items: packagePolicies.saved_objects.map((packagePolicySO) => ({
        id: packagePolicySO.id,
        version: packagePolicySO.version,
        ...packagePolicySO.attributes,
      })),
      total: packagePolicies.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicy: UpdatePackagePolicy,
    options?: { user?: AuthenticatedUser }
  ): Promise<PackagePolicy> {
    const oldPackagePolicy = await this.get(soClient, id);
    const { version, ...restOfPackagePolicy } = packagePolicy;

    if (!oldPackagePolicy) {
      throw new Error('Package policy not found');
    }

    // Check that its agent policy does not have a package policy with the same name
    const parentAgentPolicy = await agentPolicyService.get(soClient, packagePolicy.policy_id);
    if (!parentAgentPolicy) {
      throw new Error('Agent policy not found');
    } else {
      if (
        (parentAgentPolicy.package_policies as PackagePolicy[]).find(
          (siblingPackagePolicy) =>
            siblingPackagePolicy.id !== id && siblingPackagePolicy.name === packagePolicy.name
        )
      ) {
        throw new Error('There is already a package with the same name on this agent policy');
      }
    }

    let inputs = await restOfPackagePolicy.inputs.map((input) =>
      assignIdsToInputAndStream(oldPackagePolicy.id, input)
    );

    if (packagePolicy.package?.name) {
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package.name,
        pkgVersion: packagePolicy.package.version,
      });

      inputs = await this.assignPackageStream(pkgInfo, inputs);
    }

    await soClient.update<PackagePolicySOAttributes>(
      SAVED_OBJECT_TYPE,
      id,
      {
        ...restOfPackagePolicy,
        inputs,
        revision: oldPackagePolicy.revision + 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user?.username ?? 'system',
      },
      {
        version,
      }
    );

    // Bump revision of associated agent policy
    await agentPolicyService.bumpRevision(soClient, packagePolicy.policy_id, {
      user: options?.user,
    });

    return (await this.get(soClient, id)) as PackagePolicy;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    ids: string[],
    options?: { user?: AuthenticatedUser; skipUnassignFromAgentPolicies?: boolean }
  ): Promise<DeletePackagePoliciesResponse> {
    const result: DeletePackagePoliciesResponse = [];

    for (const id of ids) {
      try {
        const packagePolicy = await this.get(soClient, id);
        if (!packagePolicy) {
          throw new Error('Package policy not found');
        }
        if (!options?.skipUnassignFromAgentPolicies) {
          await agentPolicyService.unassignPackagePolicies(
            soClient,
            packagePolicy.policy_id,
            [packagePolicy.id],
            {
              user: options?.user,
            }
          );
        }
        await soClient.delete(SAVED_OBJECT_TYPE, id);
        result.push({
          id,
          name: packagePolicy.name,
          success: true,
        });
      } catch (e) {
        result.push({
          id,
          success: false,
        });
      }
    }

    return result;
  }

  public async buildPackagePolicyFromPackage(
    soClient: SavedObjectsClientContract,
    pkgName: string
  ): Promise<NewPackagePolicy | undefined> {
    const pkgInstall = await getInstallation({ savedObjectsClient: soClient, pkgName });
    if (pkgInstall) {
      const [pkgInfo, defaultOutputId] = await Promise.all([
        getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: pkgInstall.name,
          pkgVersion: pkgInstall.version,
        }),
        outputService.getDefaultOutputId(soClient),
      ]);
      if (pkgInfo) {
        if (!defaultOutputId) {
          throw new Error('Default output is not set');
        }
        return packageToPackagePolicy(pkgInfo, '', defaultOutputId);
      }
    }
  }

  public async assignPackageStream(
    pkgInfo: PackageInfo,
    inputs: PackagePolicyInput[]
  ): Promise<PackagePolicyInput[]> {
    const registryPkgInfo = await Registry.fetchInfo(pkgInfo.name, pkgInfo.version);
    const inputsPromises = inputs.map((input) =>
      _assignPackageStreamToInput(registryPkgInfo, pkgInfo, input)
    );

    return Promise.all(inputsPromises);
  }
}

function assignIdsToInputAndStream(
  packagePolicyId: string,
  input: NewPackagePolicyInput
): PackagePolicyInput {
  return {
    ...input,
    id: `${input.type}-${packagePolicyId}`,
    streams: input.streams.map((stream) => {
      return { ...stream, id: `${input.type}-${stream.data_stream.dataset}-${packagePolicyId}` };
    }),
  };
}

async function _assignPackageStreamToInput(
  registryPkgInfo: RegistryPackage,
  pkgInfo: PackageInfo,
  input: PackagePolicyInput
) {
  const streamsPromises = input.streams.map((stream) =>
    _assignPackageStreamToStream(registryPkgInfo, pkgInfo, input, stream)
  );

  const streams = await Promise.all(streamsPromises);
  return { ...input, streams };
}

async function _assignPackageStreamToStream(
  registryPkgInfo: RegistryPackage,
  pkgInfo: PackageInfo,
  input: PackagePolicyInput,
  stream: PackagePolicyInputStream
) {
  if (!stream.enabled) {
    return { ...stream, compiled_stream: undefined };
  }
  const datasetPath = getDataset(stream.data_stream.dataset);
  const packageDataStreams = pkgInfo.data_streams;
  if (!packageDataStreams) {
    throw new Error('Stream template not found, no data streams');
  }

  const packageDataStream = packageDataStreams.find(
    (pkgDataStream) => pkgDataStream.dataset === stream.data_stream.dataset
  );
  if (!packageDataStream) {
    throw new Error(`Stream template not found, unable to find dataset ${datasetPath}`);
  }

  const streamFromPkg = (packageDataStream.streams || []).find(
    (pkgStream) => pkgStream.input === input.type
  );
  if (!streamFromPkg) {
    throw new Error(`Stream template not found, unable to find stream for input ${input.type}`);
  }

  if (!streamFromPkg.template_path) {
    throw new Error(`Stream template path not found for dataset ${datasetPath}`);
  }

  const [pkgStream] = await getAssetsData(
    registryPkgInfo,
    (path: string) => path.endsWith(streamFromPkg.template_path),
    datasetPath
  );

  if (!pkgStream || !pkgStream.buffer) {
    throw new Error(
      `Unable to load stream template ${streamFromPkg.template_path} for dataset ${datasetPath}`
    );
  }

  const yaml = createStream(
    // Populate template variables from input vars and stream vars
    Object.assign({}, input.vars, stream.vars),
    pkgStream.buffer.toString()
  );

  stream.compiled_stream = yaml;

  return { ...stream };
}

export type PackagePolicyServiceInterface = PackagePolicyService;
export const packagePolicyService = new PackagePolicyService();
