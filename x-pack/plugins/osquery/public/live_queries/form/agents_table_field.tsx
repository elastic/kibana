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

interface IProps {
  name: string;
}

const checkAgentsLength = (agentsSelection: AgentSelection) => {
  if (!isEmpty(agentsSelection)) {
    return !!(
      agentsSelection.allAgentsSelected ||
      agentsSelection.agents?.length ||
      agentsSelection.platformsSelected?.length ||
      agentsSelection.policiesSelected?.length
    );
  }

  return false;
};

const AgentsTableFieldComponent: React.FC<IProps> = ({ name }) => {
  const { field, fieldState } = useController({
    name,
    rules: {
      validate: checkAgentsLength,
    },
    defaultValue: {},
  });
  const { onChange, value } = field;
  const { error } = fieldState;

  const errorMessage =
    error?.message || error?.type === 'validate'
      ? i18n.translate('xpack.osquery.pack.queryFlyoutForm.osqueryAgentsMissingErrorMessage', {
          defaultMessage: 'Agents is a required field',
        })
      : undefined;

  return <AgentsTable agentSelection={value} onChange={onChange} error={errorMessage} />;
};

export const AgentsTableField = React.memo(AgentsTableFieldComponent);
