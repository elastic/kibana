/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  AgentPolicy,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
  SO_SEARCH_LIMIT,
} from '@kbn/fleet-plugin/common';
import { agentPolicyService } from '@kbn/fleet-plugin/server/services';
import { AGENTLESS_POLICY_ID } from '@kbn/fleet-plugin/common/constants';
import type {
  CloudbeatConfigKeyType,
  CloudSecurityInstallationStats,
  SetupAccessOption,
} from './types';
import type { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../../../common/constants';

interface CredentialMappings {
  'gcp.credentials.file': 'credentials file';
  'gcp.credentials.json': 'credentials json';
  shared_credential_file: 'credentials file';
  role_arn: 'role';
}

const getEnabledInputStreamVars = (packagePolicy: PackagePolicy) => {
  const enabledInput = packagePolicy.inputs.find((input) => input.enabled);
  return enabledInput?.streams[0].vars;
};

const getEnabledIsSetupAutomatic = (packagePolicy: PackagePolicy) => {
  const cloudbeatConfig: Record<CloudbeatConfigKeyType, string> = {
    'cloudbeat/cis_aws': 'cloud_formation_template_url',
    'cloudbeat/vuln_mgmt_aws': 'cloud_formation_template_url',
    'cloudbeat/cis_gcp': 'cloud_shell_url',
    'cloudbeat/cis_azure': 'arm_template_url',
  };

  const enabledInput = packagePolicy.inputs.find((input) => input.enabled);

  if (!enabledInput) return false;

  const configKey = cloudbeatConfig[enabledInput.type as CloudbeatConfigKeyType];

  return !!configKey && !!enabledInput.config?.[configKey]?.value;
};

const getSetupAccessOption = (
  packagePolicy: PackagePolicy
): CloudSecurityInstallationStats['setup_access_option'] => {
  const inputStreamVars = getEnabledInputStreamVars(packagePolicy);

  if (!inputStreamVars) return null;

  const credentialMappings: Record<string, SetupAccessOption> = {
    'gcp.credentials.file': 'credentials file',
    'gcp.credentials.json': 'credentials json',
    shared_credential_file: 'credentials file',
    role_arn: 'role',
  };

  for (const [key, config] of Object.entries(inputStreamVars)) {
    if (config?.value && credentialMappings[key as keyof CredentialMappings]) {
      return credentialMappings[key as keyof CredentialMappings];
    }
  }

  if (inputStreamVars.session_token) return 'temporary access';
  if (inputStreamVars.access_key && inputStreamVars.secret_access_key) return 'direct access';

  return null;
};

const getAccountTypeField = (
  packagePolicy: PackagePolicy
): CloudSecurityInstallationStats['account_type'] => {
  if (packagePolicy.vars?.posture?.value !== 'cspm') return;

  const inputStreamVars = getEnabledInputStreamVars(packagePolicy);
  const cloudProvider = packagePolicy.vars?.deployment?.value;
  const accountType = inputStreamVars?.[`${cloudProvider}.account_type`]?.value;

  // If the account_type field is not present, we can assume that the cspm integrations is a single accounts,
  // as this field did not exist before organization accounts were introduced.
  if (!accountType) return 'single-account';

  return accountType;
};

const getInstalledPackagePolicies = (
  packagePolicies: PackagePolicy[],
  agentPolicies: AgentPolicy[]
) => {
  const installationStats = packagePolicies.flatMap(
    (packagePolicy: PackagePolicy): CloudSecurityInstallationStats[] =>
      packagePolicy.policy_ids.map((agentPolicyId) => {
        const agentCounts =
          agentPolicies?.find((agentPolicy) => agentPolicy?.id === agentPolicyId)?.agents ?? 0;

        const isAgentless = agentPolicyId === AGENTLESS_POLICY_ID;

        const isSetupAutomatic = getEnabledIsSetupAutomatic(packagePolicy);

        return {
          package_policy_id: packagePolicy.id,
          feature: packagePolicy.vars?.posture?.value as string,
          deployment_mode: packagePolicy.vars?.deployment?.value as string,
          package_version: packagePolicy.package?.version as string,
          created_at: packagePolicy.created_at,
          agent_policy_id: agentPolicyId,
          agent_count: agentCounts,
          is_agentless: isAgentless,
          account_type: getAccountTypeField(packagePolicy),
          is_setup_automatic: isSetupAutomatic,
          setup_access_option: isSetupAutomatic ? null : getSetupAccessOption(packagePolicy),
        };
      })
  );

  return installationStats;
};

export const getInstallationStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
): Promise<CloudSecurityInstallationStats[]> => {
  const [, cspServerPluginStartDeps] = await coreServices;

  const cspContext = {
    logger,
    esClient,
    soClient,
    agentPolicyService: cspServerPluginStartDeps.fleet.agentPolicyService,
    packagePolicyService: cspServerPluginStartDeps.fleet.packagePolicyService,
    isPluginInitialized,
  };

  const packagePolicies = await cspContext.packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}"`,
  });
  if (!packagePolicies) return [];

  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: '',
    esClient,
    withAgentCount: true,
  });

  const installationStats: CloudSecurityInstallationStats[] = getInstalledPackagePolicies(
    packagePolicies.items,
    agentPolicies?.items || []
  );

  return installationStats;
};

const isPluginInitialized = (): boolean => {
  return true;
};
