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
import { APIReturnType } from '../..//services/rest/createCallApmApi';
import { getCommands } from './commands/get_commands';
import { CopyCommands } from './copy_commands';
import { getPolicyOptions, PolicyOption } from './get_policy_options';
import { PolicySelector } from './policy_selector';

export type APIResponseType = APIReturnType<'GET /api/apm/fleet/agents'>;

const CentralizedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MANAGE_FLEET_POLICIES_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.manageFleetPolicies',
  { defaultMessage: 'Manage fleet policies' }
);

const GET_STARTED_WITH_FLEET_LABEL = i18n.translate(
  'xpack.apm.tutorial.agent_config.getStartedWithFleet',
  { defaultMessage: 'Get started with fleet' }
);

interface Props {
  variantId: string;
  http: HttpStart;
  basePath: string;
  isCloudEnabled: boolean;
}

const INITIAL_STATE = {
  fleetAgents: [],
  cloudStandaloneSetup: undefined,
  isFleetEnabled: false,
};

function getFleetLink({
  isFleetEnabled,
  hasFleetAgents,
  basePath,
}: {
  isFleetEnabled: boolean;
  hasFleetAgents: boolean;
  basePath: string;
}) {
  if (!isFleetEnabled) {
    return;
  }

  return hasFleetAgents
    ? {
        label: MANAGE_FLEET_POLICIES_LABEL,
        href: `${basePath}/app/fleet#/policies`,
      }
    : {
        label: GET_STARTED_WITH_FLEET_LABEL,
        href: `${basePath}/app/integrations#/detail/apm-0.4.0/overview`,
      };
}

function TutorialConfigAgent({
  variantId,
  http,
  basePath,
  isCloudEnabled,
}: Props) {
  const [data, setData] = useState<APIResponseType>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<PolicyOption>();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/api/apm/fleet/agents');
        if (response) {
          setData(response as APIResponseType);
        }
      } catch (e) {
        setIsLoading(false);
        console.error('Error while fetching fleet agents.', e);
      }
    }
    fetchData();
  }, [http]);

  // Depending the environment running (onPrem/Cloud) different values must be available and automatically selected
  const options = useMemo(() => {
    const availableOptions = getPolicyOptions({
      isCloudEnabled,
      data,
    });
    const defaultSelectedOption = availableOptions.find(
      ({ isSelected }) => isSelected
    );
    setSelectedOption(defaultSelectedOption);
    setIsLoading(false);
    return availableOptions;
  }, [data, isCloudEnabled]);

  if (isLoading) {
    return (
      <CentralizedContainer data-test-subj="loading">
        <EuiLoadingSpinner />
      </CentralizedContainer>
    );
  }

  const commands = getCommands({
    variantId,
    policyDetails: {
      apmServerUrl: selectedOption?.apmServerUrl,
      secretToken: selectedOption?.secretToken,
    },
  });

  const hasFleetAgents = !!data.fleetAgents.length;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <PolicySelector
            options={options}
            selectedOption={selectedOption}
            onChange={(newSelectedOption) =>
              setSelectedOption(newSelectedOption)
            }
            fleetLink={getFleetLink({
              isFleetEnabled: data.isFleetEnabled,
              hasFleetAgents,
              basePath,
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CopyCommands commands={commands} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiCodeBlock language="bash" data-test-subj="commands">
        {commands}
      </EuiCodeBlock>
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default TutorialConfigAgent;
