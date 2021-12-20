/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { NewAgentPolicy, AgentPolicy } from '../../../types';

import type { ValidationResults } from './agent_policy_validation';

interface Props {
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  validation: ValidationResults;
  nameLabel?: ReactElement<any, any>;
}

export const AgentPolicyGeneralFields: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
  validation,
  nameLabel,
}) => {
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});

  return (
    <EuiFormRow
      fullWidth
      key="name"
      label={
        nameLabel || (
          <FormattedMessage id="xpack.fleet.agentPolicyForm.nameFieldLabel" defaultMessage="Name" />
        )
      }
      error={touchedFields.name && validation.name ? validation.name : null}
      isInvalid={Boolean(touchedFields.name && validation.name)}
    >
      <EuiFieldText
        disabled={agentPolicy.is_managed === true}
        fullWidth
        value={agentPolicy.name}
        onChange={(e) => updateAgentPolicy({ name: e.target.value })}
        isInvalid={Boolean(touchedFields.name && validation.name)}
        onBlur={() => setTouchedFields({ ...touchedFields, name: true })}
        placeholder={i18n.translate('xpack.fleet.agentPolicyForm.nameFieldPlaceholder', {
          defaultMessage: 'Choose a name',
        })}
      />
    </EuiFormRow>
  );
};
