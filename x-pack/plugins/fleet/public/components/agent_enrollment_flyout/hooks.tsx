/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import crypto from 'crypto';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { safeDump } from 'js-yaml';

import type { PackagePolicy, AgentPolicy } from '../../types';
import {
  sendGetOneAgentPolicy,
  sendGetOneAgentPolicyFull,
  useGetPackageInfoByKeyQuery,
  useStartServices,
} from '../../hooks';
import {
  FLEET_KUBERNETES_PACKAGE,
  FLEET_CLOUD_SECURITY_POSTURE_PACKAGE,
  FLEET_CLOUD_DEFEND_PACKAGE,
} from '../../../common';

import {
  getTemplateUrlFromAgentPolicy,
  getTemplateUrlFromPackageInfo,
  getCloudShellUrlFromAgentPolicy,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG,
} from '../cloud_security_posture/services';

import { sendCreateStandaloneAgentAPIKey } from '../../hooks';

import type { FullAgentPolicy } from '../../../common';

import { fullAgentPolicyToYaml } from '../../services';

import type {
  K8sMode,
  CloudSecurityIntegrationType,
  CloudSecurityIntegrationAwsAccountType,
  CloudSecurityIntegration,
  CloudSecurityIntegrationAzureAccountType,
} from './types';

// Packages that requires custom elastic-agent manifest
const K8S_PACKAGES = new Set([FLEET_KUBERNETES_PACKAGE, FLEET_CLOUD_DEFEND_PACKAGE]);

export function useAgentPolicyWithPackagePolicies(policyId?: string) {
  const [agentPolicyWithPackagePolicies, setAgentPolicy] = useState<AgentPolicy | null>(null);
  const core = useStartServices();
  const { notifications } = core;

  useEffect(() => {
    async function loadPolicy(policyIdToLoad?: string) {
      if (!policyIdToLoad) {
        return;
      }
      try {
        const agentPolicyRequest = await sendGetOneAgentPolicy(policyIdToLoad);

        setAgentPolicy(agentPolicyRequest.data ? agentPolicyRequest.data.item : null);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.agentEnrollment.loadPolicyErrorMessage', {
            defaultMessage: 'An error happened while loading the policy',
          }),
        });
      }
    }

    loadPolicy(policyId);
  }, [policyId, notifications.toasts]);

  return { agentPolicyWithPackagePolicies };
}

export function useIsK8sPolicy(agentPolicy?: AgentPolicy) {
  const [isK8s, setIsK8s] = useState<K8sMode>('IS_LOADING');

  useEffect(() => {
    async function checkifK8s() {
      if (!agentPolicy) {
        setIsK8s('IS_LOADING');
        return;
      }

      setIsK8s(
        (agentPolicy.package_policies as PackagePolicy[]).some(isK8sPackage)
          ? 'IS_KUBERNETES'
          : 'IS_NOT_KUBERNETES'
      );
    }

    checkifK8s();
  }, [agentPolicy]);

  return { isK8s };
}

export function useCloudSecurityIntegration(agentPolicy?: AgentPolicy) {
  const cloudSecurityPackagePolicy = useMemo(() => {
    return getCloudSecurityPackagePolicyFromAgentPolicy(agentPolicy);
  }, [agentPolicy]);

  const integrationVersion = cloudSecurityPackagePolicy?.package?.version;

  // Fetch the package info to get the CloudFormation template URL only
  // if the package policy is a Cloud Security policy
  const { data: packageInfoData, isLoading } = useGetPackageInfoByKeyQuery(
    FLEET_CLOUD_SECURITY_POSTURE_PACKAGE,
    integrationVersion,
    { full: true },
    { enabled: Boolean(cloudSecurityPackagePolicy) }
  );

  const AWS_ACCOUNT_TYPE = 'aws.account_type';
  const AZURE_ACCOUNT_TYPE = 'azure.account_type';

  const cloudSecurityIntegration: CloudSecurityIntegration | undefined = useMemo(() => {
    if (!agentPolicy || !cloudSecurityPackagePolicy) {
      return undefined;
    }

    const integrationType = cloudSecurityPackagePolicy.inputs?.find((input) => input.enabled)
      ?.policy_template as CloudSecurityIntegrationType;

    if (!integrationType) return undefined;

    const cloudFormationTemplateFromAgentPolicy = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.CLOUD_FORMATION,
      agentPolicy
    );

    const azureArmTemplateFromAgentPolicy = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.ARM_TEMPLATE,
      agentPolicy
    );

    // Use the latest CloudFormation template for the current version
    // So it guarantee that the template version matches the integration version
    // when the integration is upgraded.
    // In case it can't find the template for the current version,
    // it will fallback to the one from the agent policy.
    const cloudFormationTemplateUrl = packageInfoData?.item
      ? getTemplateUrlFromPackageInfo(
          packageInfoData.item,
          integrationType,
          SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION
        )
      : cloudFormationTemplateFromAgentPolicy;

    const cloudFormationAwsAccountType: CloudSecurityIntegrationAwsAccountType | undefined =
      cloudSecurityPackagePolicy?.inputs?.find((input) => input.enabled)?.streams?.[0]?.vars?.[
        AWS_ACCOUNT_TYPE
      ]?.value;

    const azureArmTemplateUrl = packageInfoData?.item
      ? getTemplateUrlFromPackageInfo(
          packageInfoData.item,
          integrationType,
          SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.ARM_TEMPLATE
        )
      : azureArmTemplateFromAgentPolicy;

    const azureArmTemplateAccountType: CloudSecurityIntegrationAzureAccountType | undefined =
      cloudSecurityPackagePolicy?.inputs?.find((input) => input.enabled)?.streams?.[0]?.vars?.[
        AZURE_ACCOUNT_TYPE
      ]?.value;

    const cloudShellUrl = getCloudShellUrlFromAgentPolicy(agentPolicy);
    return {
      isLoading,
      integrationType,
      isCloudFormation: Boolean(cloudFormationTemplateFromAgentPolicy),
      cloudFormationProps: {
        awsAccountType: cloudFormationAwsAccountType,
        templateUrl: cloudFormationTemplateUrl,
      },
      isAzureArmTemplate: Boolean(azureArmTemplateFromAgentPolicy),
      azureArmTemplateProps: {
        azureAccountType: azureArmTemplateAccountType,
        templateUrl: azureArmTemplateUrl,
      },
      cloudShellUrl,
    };
  }, [agentPolicy, packageInfoData?.item, isLoading, cloudSecurityPackagePolicy]);

  return { cloudSecurityIntegration };
}

const isK8sPackage = (pkg: PackagePolicy) => {
  const name = pkg.package?.name as string;

  return K8S_PACKAGES.has(name);
};

const getCloudSecurityPackagePolicyFromAgentPolicy = (
  agentPolicy?: AgentPolicy
): PackagePolicy | undefined => {
  return agentPolicy?.package_policies?.find(
    (input) => input.package?.name === FLEET_CLOUD_SECURITY_POSTURE_PACKAGE
  );
};

export function useGetCreateApiKey() {
  const core = useStartServices();

  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const onCreateApiKey = useCallback(async () => {
    try {
      const res = await sendCreateStandaloneAgentAPIKey({
        name: crypto.randomBytes(16).toString('hex'),
      });
      const newApiKey = `${res.data?.item.id}:${res.data?.item.api_key}`;
      setApiKey(newApiKey);
    } catch (err) {
      core.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.standaloneAgentPage.errorCreatingAgentAPIKey', {
          defaultMessage: 'Error creating Agent API Key',
        }),
      });
    }
  }, [core.notifications.toasts]);
  return {
    apiKey,
    onCreateApiKey,
  };
}

export function useFetchFullPolicy(agentPolicy: AgentPolicy | undefined, isK8s?: K8sMode) {
  const core = useStartServices();
  const [yaml, setYaml] = useState<any | undefined>('');
  const [fullAgentPolicy, setFullAgentPolicy] = useState<FullAgentPolicy | undefined>();
  const { apiKey, onCreateApiKey } = useGetCreateApiKey();

  useEffect(() => {
    async function fetchFullPolicy() {
      try {
        if (!agentPolicy?.id) {
          return;
        }
        let query = { standalone: true, kubernetes: false };
        if (isK8s === 'IS_KUBERNETES') {
          query = { standalone: true, kubernetes: true };
        }
        const res = await sendGetOneAgentPolicyFull(agentPolicy?.id, query);
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching full agent policy');
        }
        setFullAgentPolicy(res.data.item);
      } catch (error) {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.standaloneAgentPage.errorFetchingFullAgentPolicy', {
            defaultMessage: 'Error fetching full agent policy',
          }),
        });
      }
    }

    if (isK8s === 'IS_NOT_KUBERNETES' || isK8s !== 'IS_LOADING') {
      fetchFullPolicy();
    }
  }, [core.http.basePath, agentPolicy?.id, core.notifications.toasts, apiKey, isK8s, agentPolicy]);

  useEffect(() => {
    if (!fullAgentPolicy) {
      return;
    }

    if (isK8s === 'IS_KUBERNETES') {
      if (typeof fullAgentPolicy === 'object') {
        return;
      }
      setYaml(fullAgentPolicy);
    } else {
      if (typeof fullAgentPolicy === 'string') {
        return;
      }
      setYaml(fullAgentPolicyToYaml(fullAgentPolicy, safeDump, apiKey));
    }
  }, [apiKey, fullAgentPolicy, isK8s]);

  const downloadYaml = useMemo(
    () => () => {
      const link = document.createElement('a');
      link.href = `data:text/json;charset=utf-8,${yaml}`;
      link.download = `elastic-agent.yaml`;
      link.click();
    },
    [yaml]
  );

  return {
    yaml,
    onCreateApiKey,
    fullAgentPolicy,
    apiKey,
    downloadYaml,
  };
}
