/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import type { CustomComponentProps } from '@kbn/home-plugin/public';
import type { APIReturnType } from '../../services/rest/create_call_apm_api';
import { AgentConfigInstructions } from './agent_config_instructions';
import type { PolicyOption } from './get_policy_options';
import { getPolicyOptions } from './get_policy_options';
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

export function TutorialConfigAgent({
  variantId,
  http,
  basePath,
  isCloudEnabled,
  kibanaVersion,
}: Pick<
  CustomComponentProps,
  'variantId' | 'http' | 'basePath' | 'isCloudEnabled' | 'kibanaVersion'
>) {
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
    const defaultSelectedOption = availableOptions.find(({ isSelected }) => isSelected);
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
      <AgentConfigInstructions
        variantId={variantId}
        apmServerUrl={selectedOption?.apmServerUrl}
        secretToken={selectedOption?.secretToken}
      />
    </>
  );
}
