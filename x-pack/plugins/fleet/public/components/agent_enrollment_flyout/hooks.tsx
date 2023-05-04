/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import type { PackagePolicy, AgentPolicy } from '../../types';
import { sendGetOneAgentPolicy, useStartServices } from '../../hooks';
import {
  FLEET_KUBERNETES_PACKAGE,
  FLEET_CLOUD_SECURITY_POSTURE_PACKAGE,
  FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE,
} from '../../../common';

import type { K8sMode } from './types';

// Packages that requires custom elastic-agent manifest
const K8S_PACKAGES = new Set([FLEET_KUBERNETES_PACKAGE]);

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

const isK8sPackage = (pkg: PackagePolicy) => {
  const name = pkg.package?.name as string;
  if (name === FLEET_CLOUD_SECURITY_POSTURE_PACKAGE) {
    return pkg.inputs.some(
      (input) =>
        input.enabled && input.policy_template === FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE
    );
  }

  return K8S_PACKAGES.has(name);
};
