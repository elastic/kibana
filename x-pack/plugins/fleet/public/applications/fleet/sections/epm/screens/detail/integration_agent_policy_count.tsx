/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useGetAgentPolicies } from '../../../../hooks';

/**
 * Displays a count of Agent Policies that are using the given integration
 */
export const IntegrationAgentPolicyCount = memo<{ packageName: string }>(({ packageName }) => {
  const [count, setCount] = useState<number>(0);
  const {} = useGetAgentPolicies({ kuery: '', page: 1, perPage: 1 });
  return (
    <FormattedMessage
      id="xpack.fleet.epm.usedByAgentPoliciesValue"
      defaultMessage="{count} agent policies"
      values={{ count }}
    />
  );
});
