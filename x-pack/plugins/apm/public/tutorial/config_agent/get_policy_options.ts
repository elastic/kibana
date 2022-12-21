/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { POLICY_ELASTIC_AGENT_ON_CLOUD } from '../../../common/fleet';
import { APIResponseType } from '.';

const DEFAULT_STANDALONE_CONFIG_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.defaultStandaloneConfig',
  { defaultMessage: 'Default Standalone configuration' }
);

export type PolicyOption = ReturnType<typeof getPolicyOptions>[0];

export function getPolicyOptions({
  isCloudEnabled,
  data,
}: {
  isCloudEnabled: boolean;
  data: APIResponseType;
}) {
  const isCloudVisible = !!(
    isCloudEnabled && data.cloudStandaloneSetup?.apmServerUrl
  );

  const fleetAgentsOptions = data.fleetAgents.map((agent) => {
    return {
      key: agent.id,
      type: 'fleetAgents',
      label: agent.name,
      apmServerUrl: agent.apmServerUrl,
      secretToken: agent.secretToken,
      isVisible: true,
      isSelected: agent.id === POLICY_ELASTIC_AGENT_ON_CLOUD,
    };
  });

  const hasFleetAgentsSelected = fleetAgentsOptions.some(
    ({ isSelected }) => isSelected
  );

  return [
    {
      key: 'cloud',
      type: 'standalone',
      label: DEFAULT_STANDALONE_CONFIG_LABEL,
      apmServerUrl: data.cloudStandaloneSetup?.apmServerUrl,
      secretToken: data.cloudStandaloneSetup?.secretToken,
      isVisible: isCloudVisible && !hasFleetAgentsSelected,
      isSelected: !hasFleetAgentsSelected,
    },
    {
      key: 'onPrem',
      type: 'standalone',
      label: DEFAULT_STANDALONE_CONFIG_LABEL,
      apmServerUrl: 'http://localhost:8200',
      secretToken: '',
      isVisible: !isCloudVisible && !hasFleetAgentsSelected,
      isSelected: !hasFleetAgentsSelected,
    },
    ...fleetAgentsOptions,
  ].filter(({ isVisible }) => isVisible);
}
