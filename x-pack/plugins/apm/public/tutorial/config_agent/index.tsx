/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCodeBlock, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HttpStart } from '@kbn/core/public';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { APIReturnType } from '../../services/rest/create_call_apm_api';
import { getCommands } from './commands/get_commands';
import { getPolicyOptions, PolicyOption } from './get_policy_options';
import { PolicySelector } from './policy_selector';

export type APIResponseType = APIReturnType<'GET /internal/apm/fleet/agents'>;

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
  kibanaVersion: string;
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
  kibanaVersion,
}: {
  isFleetEnabled: boolean;
  hasFleetAgents: boolean;
  basePath: string;
  kibanaVersion: string;
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
        href: `${basePath}/app/integrations#/detail/apm/overview`,
      };
}

function TutorialConfigAgent({
  variantId,
  http,
  basePath,
  isCloudEnabled,
  kibanaVersion,
}: Props) {
  const [data, setData] = useState<APIResponseType>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<PolicyOption>();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/internal/apm/fleet/agents');
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
      <PolicySelector
        options={options}
        selectedOption={selectedOption}
        onChange={(newSelectedOption) => setSelectedOption(newSelectedOption)}
        fleetLink={getFleetLink({
          isFleetEnabled: data.isFleetEnabled,
          hasFleetAgents,
          basePath,
          kibanaVersion,
        })}
      />

      <EuiSpacer />
      <EuiCodeBlock isCopyable language="bash" data-test-subj="commands">
        {commands}
      </EuiCodeBlock>
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default TutorialConfigAgent;
