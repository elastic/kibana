/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { useConfig } from '../../../../hooks';

export const AgentSoftLimitCallout = () => {
  const config = useConfig();

  return (
    <EuiCallOut
      iconType="warning"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.fleet.agentSoftLimitCallout.calloutTitle"
          defaultMessage="Max number of online agents reached"
        />
      }
    >
      <FormattedMessage
        id="xpack.fleet.agentSoftLimitCallout.calloutDescription"
        defaultMessage="Fleet supports a maximum of {nbAgents} active agents. You need to unenroll some agents to ensure that all active agents are able to connect and new agents can be enrolled."
        values={{
          nbAgents: <FormattedNumber value={config.internal?.activeAgentsSoftLimit ?? 25000} />,
        }}
      />
    </EuiCallOut>
  );
};
