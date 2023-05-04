/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AgentConfigurationPageStep } from '../../../../common/agent_configuration/constants';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { AgentConfigurationCreateEdit } from '../../app/settings/agent_configurations/agent_configuration_create_edit';

export function EditAgentConfigurationRouteView() {
  const {
    query: {
      name,
      environment,
      pageStep = AgentConfigurationPageStep.ChooseSettings,
    },
  } = useApmParams('/settings/agent-configuration/edit');

  const res = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /api/apm/settings/agent-configuration/view', {
        params: { query: { name, environment } },
      });
    },
    [name, environment]
  );

  return (
    <AgentConfigurationCreateEdit
      pageStep={pageStep}
      existingConfigResult={res}
    />
  );
}
