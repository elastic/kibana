/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AgentsTable } from '../../agents/agents_table';
import type { AgentSelection } from '../../agents/types';

const checkAgentsLength = (agentsSelection: AgentSelection) => {
  if (!isEmpty(agentsSelection)) {
    const isValid = !!(
      agentsSelection.allAgentsSelected ||
      agentsSelection.agents?.length ||
      agentsSelection.platformsSelected?.length ||
      agentsSelection.policiesSelected?.length
    );

    return !isValid
      ? i18n.translate('xpack.osquery.pack.queryFlyoutForm.osqueryAgentsMissingErrorMessage', {
          defaultMessage: 'Agents is a required field',
        })
      : undefined;
  }

  return i18n.translate('xpack.osquery.pack.queryFlyoutForm.osqueryAgentsMissingErrorMessage', {
    defaultMessage: 'Agents is a required field',
  });
};

const AgentsTableFieldComponent: React.FC<{}> = () => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'agentSelection',
    rules: {
      validate: checkAgentsLength,
    },
    defaultValue: {},
  });

  return <AgentsTable agentSelection={value} onChange={onChange} error={error?.message} />;
};

export const AgentsTableField = React.memo(AgentsTableFieldComponent);
