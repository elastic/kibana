/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HttpStart } from 'kibana/public';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { CopyCommands } from '../copy_commands';
import {
  EnvironmentConfigurationOption,
  EnvironmentConfigurationSelector,
} from './environment_configuration_selector';
import { getCommands } from './commands/get_commands';

const POLICY_ELASTIC_AGENT_ON_CLOUD = 'policy-elastic-agent-on-cloud';

interface Props {
  variantId: string;
  http: HttpStart;
  basePath: string;
  isCloudEnabled: boolean;
}

const CentralizedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

type APIResponseType = APIReturnType<'GET /api/apm/fleet/agents'>;

const DEFAULT_STANDALONE_CONFIG_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.defaultStandaloneConfig',
  { defaultMessage: 'Default Standalone configuration' }
);

const MANAGE_FLEET_POLICIES_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.manageFleetPolicies',
  { defaultMessage: 'Manage fleet policies' }
);

const GET_STARTED_WITH_FLEET_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.getStartedWithFleet',
  { defaultMessage: 'Get started with fleet' }
);

export function getEnvironmentConfigurationOptions({
  isCloudEnabled,
  data,
}: {
  isCloudEnabled: boolean;
  data: APIResponseType;
}) {
  const newOptions: EnvironmentConfigurationOption[] = [];
  // When running on cloud and apm.url is defined
  if (isCloudEnabled && data.cloudStandaloneSetup?.apmServerUrl) {
    // pushes APM cloud standalone
    newOptions.push({
      key: 'cloud_standalone',
      label: DEFAULT_STANDALONE_CONFIG_LABEL,
      apmServerUrl: data.cloudStandaloneSetup?.apmServerUrl,
      secretToken: data.cloudStandaloneSetup?.secretToken,
      checked: data.hasPolicyElasticOnCloud ? undefined : 'on',
    });
  } else {
    // pushes APM onprem standalone
    newOptions.push({
      key: 'onPrem_standalone',
      label: DEFAULT_STANDALONE_CONFIG_LABEL,
      apmServerUrl: 'http://localhost:8200',
      secretToken: '',
      checked: data.hasPolicyElasticOnCloud ? undefined : 'on',
    });
  }

  // remaining agents with APM integration
  newOptions.push(
    ...data.agents.map(
      ({
        id,
        name,
        apmServerUrl,
        secretToken,
      }): EnvironmentConfigurationOption => ({
        key: id,
        label: name,
        apmServerUrl,
        secretToken,
        checked: name === POLICY_ELASTIC_AGENT_ON_CLOUD ? 'on' : undefined,
      })
    )
  );

  return newOptions;
}

function TutorialAgentSecretTokenSelector({
  variantId,
  http,
  basePath,
  isCloudEnabled,
}: Props) {
  const [data, setData] = useState<APIResponseType>({
    agents: [],
    hasPolicyElasticOnCloud: false,
    cloudStandaloneSetup: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [
    selectedOption,
    setSelectedOption,
  ] = useState<EnvironmentConfigurationOption>();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/api/apm/fleet/agents');
        setData(response as APIResponseType);
      } catch (e) {
        console.error('Error while fetching fleet agents.', e);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [http]);

  // Depending the environment running (onPrem/Cloud) different values must be available and automatically selected
  const options = useMemo(() => {
    return getEnvironmentConfigurationOptions({ isCloudEnabled, data });
  }, [data, isCloudEnabled]);

  if (isLoading) {
    return (
      <CentralizedContainer>
        <EuiLoadingSpinner />
      </CentralizedContainer>
    );
  }

  const command = getCommands({
    variantId,
    environmentDetails: {
      apmServerUrl: selectedOption?.apmServerUrl,
      secretToken: selectedOption?.secretToken,
    },
  });

  const hasFleetAgents = !!data.agents.length;
  const fleetLink = hasFleetAgents
    ? {
        label: MANAGE_FLEET_POLICIES_LABEL,
        href: `${basePath}/app/fleet#/policies`,
      }
    : {
        label: GET_STARTED_WITH_FLEET_LABEL,
        href: `${basePath}/app/fleet#/integrations/detail/apm-0.2.0/overview`,
      };

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EnvironmentConfigurationSelector
            options={options}
            selectedOption={selectedOption}
            onChange={(newSelectedOption) =>
              setSelectedOption(newSelectedOption)
            }
            fleetLink={fleetLink}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CopyCommands commands={command} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiCodeBlock language="bash">{command}</EuiCodeBlock>
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default TutorialAgentSecretTokenSelector;
