/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { IBasePath } from '@kbn/core/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function getUpgradeAssistantHref(basePath: IBasePath) {
  return basePath.prepend('/app/management/stack/upgrade_assistant');
}

export function useFleetCloudAgentPolicyHref() {
  const {
    core: {
      http: { basePath },
    },
  } = useApmPluginContext();
  return basePath.prepend('/app/fleet#/policies/policy-elastic-agent-on-cloud');
}

export function useUpgradeApmPackagePolicyHref(packagePolicyId = '') {
  const {
    core: {
      http: { basePath },
    },
  } = useApmPluginContext();
  return basePath.prepend(
    `/app/fleet/policies/policy-elastic-agent-on-cloud/upgrade-package-policy/${packagePolicyId}?from=integrations-policy-list`
  );
}

export function useObservabilityActiveAlertsHref(kuery: string) {
  const {
    core: {
      http: { basePath },
    },
  } = useApmPluginContext();
  return basePath.prepend(
    `/app/observability/alerts?_a=${rison.encode({ kuery, status: 'active' })}`
  );
}
