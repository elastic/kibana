/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const AgentSoftLimitCallout = () => {
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
        defaultMessage="Fleet do not support more than 250000 active agents, you should unenroll some agents to stay under that limit."
      />
    </EuiCallOut>
  );
};
