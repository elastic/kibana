/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import type { PackagePolicy, AgentPolicy } from '../../types';
import { sendGetOneAgentPolicy, useGetPackageInfoByKeyQuery, useStartServices } from '../../hooks';
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
