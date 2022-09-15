/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiButton, EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LEARN_MORE, READ_DOCS } from './empty_locations';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const AgentPolicyNeeded = () => {
  const { basePath } = useUptimeSettingsContext();

  return (
    <EuiEmptyPrompt
      hasBorder
      title={<h2>{AGENT_POLICY_NEEDED}</h2>}
      body={<p>{ADD_AGENT_POLICY_DESCRIPTION}</p>}
      actions={
        <EuiButton fill href={`${basePath}/app/fleet/policies?create`} color="primary">
          {CREATE_AGENT_POLICY}
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>{LEARN_MORE}</h3>
          </EuiTitle>
          <EuiLink
            target="_blank"
            href="https://www.elastic.co/guide/en/observability/current/uptime-set-up-choose-agent.html#private-locations"
          >
            {READ_DOCS}
          </EuiLink>
        </>
      }
    />
  );
};

const CREATE_AGENT_POLICY = i18n.translate('xpack.synthetics.monitorManagement.createAgentPolicy', {
  defaultMessage: 'Create agent policy',
});

const AGENT_POLICY_NEEDED = i18n.translate('xpack.synthetics.monitorManagement.agentPolicyNeeded', {
  defaultMessage: 'No agent policies found',
});
const ADD_AGENT_POLICY_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.addAgentPolicyDesc',
  {
    defaultMessage:
      'Private locations require an Agent policy. In order to add a private location, first you must create an Agent policy in Fleet.',
  }
);
