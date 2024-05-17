/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const UnprivilegedCallout: React.FC<{
  rootIntegrations?: Array<{ name: string; title: string }>;
  unprivilegedAgentsCount?: number;
}> = ({ rootIntegrations = [], unprivilegedAgentsCount = 0 }) => {
  const rootIntegrationsText = rootIntegrations.map((item) => item.title).join(', ');
  return rootIntegrations.length > 0 ? (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.fleet.agentEnrollmentCallout.unprivilegedAgentsTitle', {
          defaultMessage: 'Unprivileged agents',
        })}
        data-test-subj="unprivilegedAgentsCallout"
      >
        {unprivilegedAgentsCount > 0 ? (
          <FormattedMessage
            id="xpack.fleet.agentEnrollmentCallout.unprivilegedAgentsMessage"
            defaultMessage="This agent policy has integrations that require Elastic Agents to have root privileges: {rootIntegrationsText}. There {unprivilegedAgentsCount, plural, one {is # agent} other {are # agents}} running in an unprivileged mode. To ensure that all data required by the integration can be collected, re-enroll the {unprivilegedAgentsCount, plural, one {agent} other {agents}} using an account with root privileges."
            values={{
              rootIntegrationsText,
              unprivilegedAgentsCount,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentEnrollmentCallout.unprivilegedAgentsMessage"
            defaultMessage="This agent policy has integrations that require Elastic Agents to have root privileges: {rootIntegrationsText}. To ensure that all data required by the integration can be collected, enroll agents using an account with root privileges."
            values={{
              rootIntegrationsText,
            }}
          />
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
};
