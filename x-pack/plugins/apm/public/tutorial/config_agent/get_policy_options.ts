/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { APIResponseType } from './';
import { PolicySelectorOption } from './policy_selector';

const POLICY_ELASTIC_AGENT_ON_CLOUD = 'policy-elastic-agent-on-cloud';

const DEFAULT_STANDALONE_CONFIG_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.defaultStandaloneConfig',
  { defaultMessage: 'Default Standalone configuration' }
);

const onPremStandaloneOption = {
  key: 'onPrem_standalone',
  label: DEFAULT_STANDALONE_CONFIG_LABEL,
  apmServerUrl: 'http://localhost:8200',
  secretToken: '',
};

export function getPolicyOptions({
  isCloudEnabled,
  data,
}: {
  isCloudEnabled: boolean;
  data: APIResponseType;
}) {
  const availableOptions: PolicySelectorOption[] = [];
  let defaultSelectedOption: PolicySelectorOption;
  // When running on cloud and apm.url is defined
  if (isCloudEnabled && data.cloudStandaloneSetup?.apmServerUrl) {
    // pushes APM cloud standalone
    const cloudStandaloneOption = {
      key: 'cloud_standalone',
      label: DEFAULT_STANDALONE_CONFIG_LABEL,
      apmServerUrl: data.cloudStandaloneSetup?.apmServerUrl,
      secretToken: data.cloudStandaloneSetup?.secretToken,
    };
    availableOptions.push(cloudStandaloneOption);
    defaultSelectedOption = cloudStandaloneOption;
  } else {
    // pushes APM onprem standalone
    availableOptions.push(onPremStandaloneOption);
    defaultSelectedOption = onPremStandaloneOption;
  }

  if (data.agents.length) {
    // Adds fleet policies group label and remaining agents with APM integration
    availableOptions.push({
      label: i18n.translate(
        'xpack.apm.tutorial.agent_config.fleetPoliciesLabel',
        { defaultMessage: 'Fleet policies' }
      ),
      options: data.agents.map(
        (agent): PolicySelectorOption => {
          const agentOption = {
            key: agent.id,
            label: agent.name,
            apmServerUrl: agent.apmServerUrl,
            secretToken: agent.secretToken,
          };
          if (agent.id === POLICY_ELASTIC_AGENT_ON_CLOUD) {
            defaultSelectedOption = agentOption;
          }
          return agentOption;
        }
      ),
    });
  }

  return { availableOptions, defaultSelectedOption };
}
