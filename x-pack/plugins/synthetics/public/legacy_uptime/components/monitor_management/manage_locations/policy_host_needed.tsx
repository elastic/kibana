/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const PolicyHostNeeded = () => {
  const { basePath } = useUptimeSettingsContext();
  return (
    <EuiCallOut title={AGENT_POLICY_NEEDED} color="warning" iconType="help">
      <p>
        {ADD_AGENT_POLICY_DESCRIPTION}
        <EuiLink href="#">{READ_THE_DOCS}</EuiLink>.
      </p>
      <EuiButton href={`${basePath}/app/fleet/policies?create`} color="primary">
        {CREATE_AGENT_POLICY}
      </EuiButton>
    </EuiCallOut>
  );
};

const CREATE_AGENT_POLICY = i18n.translate('xpack.synthetics.monitorManagement.createAgentPolicy', {
  defaultMessage: 'Create agent policy',
});

const AGENT_POLICY_NEEDED = i18n.translate('xpack.synthetics.monitorManagement.agentPolicyNeeded', {
  defaultMessage: 'No agent policy found. Please create one.',
});
const ADD_AGENT_POLICY_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.addAgentPolicyDesc',
  {
    defaultMessage:
      'To add a synthetics private location, a Fleet policy with active elastic Agent is needed.',
  }
);

const READ_THE_DOCS = i18n.translate('xpack.synthetics.monitorManagement.readDocs', {
  defaultMessage: 'Read the docs',
});
