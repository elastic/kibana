/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath } from '../../../../../../../src/core/public';
import { useKibanaServicesContext } from '../../../context/kibana_services/use_kibana_services_context';

export function getUpgradeAssistantHref(basePath: IBasePath) {
  return basePath.prepend('/app/management/stack/upgrade_assistant');
}

export function useUpgradeAssistantHref() {
  const { http } = useKibanaServicesContext();

  return getUpgradeAssistantHref(http.basePath);
}

export function useFleetCloudAgentPolicyHref() {
  const {
    http: { basePath },
  } = useKibanaServicesContext();
  return basePath.prepend('/app/fleet#/policies/policy-elastic-agent-on-cloud');
}

export function useUpgradeApmPackagePolicyHref(packagePolicyId = '') {
  const {
    http: { basePath },
  } = useKibanaServicesContext();
  return basePath.prepend(
    `/app/fleet/policies/policy-elastic-agent-on-cloud/upgrade-package-policy/${packagePolicyId}?from=integrations-policy-list`
  );
}
