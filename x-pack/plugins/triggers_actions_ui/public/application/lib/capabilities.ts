/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * NOTE: Applications that want to show the alerting UIs will need to add
 * check against their features here until we have a better solution. This
 * will possibly go away with https://github.com/elastic/kibana/issues/52300.
 */

type Capabilities = Record<string, any>;

const apps = ['apm', 'siem', 'uptime', 'infrastructure'];

function hasCapability(capabilities: Capabilities, capability: string) {
  return apps.some((app) => capabilities[app]?.[capability]);
}

function createCapabilityCheck(capability: string) {
  return (capabilities: Capabilities) => hasCapability(capabilities, capability);
}

export const hasShowAlertsCapability = createCapabilityCheck('alerting:show');
export const hasShowActionsCapability = createCapabilityCheck('actions:show');
export const hasSaveAlertsCapability = createCapabilityCheck('alerting:save');
export const hasSaveActionsCapability = createCapabilityCheck('actions:save');
export const hasDeleteAlertsCapability = createCapabilityCheck('alerting:delete');
export const hasDeleteActionsCapability = createCapabilityCheck('actions:delete');
