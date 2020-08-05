/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';
import { useLink } from '../../../hooks';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../constants';

export const LinkedAgentCount = memo<{ count: number; agentConfigId: string }>(
  ({ count, agentConfigId }) => {
    const { getHref } = useLink();
    const displayValue = (
      <FormattedMessage
        id="xpack.ingestManager.agentConfig.linkedAgentCountText"
        defaultMessage="{count, plural, one {# agent} other {# agents}}"
        values={{ count }}
      />
    );
    return count > 0 ? (
      <EuiLink
        href={getHref('fleet_agent_list', {
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id : ${agentConfigId}`,
        })}
      >
        {displayValue}
      </EuiLink>
    ) : (
      displayValue
    );
  }
);
