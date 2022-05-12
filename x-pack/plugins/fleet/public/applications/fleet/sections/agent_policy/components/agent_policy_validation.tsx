/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { isValidNamespace } from '../../../services';
import type { NewAgentPolicy, AgentPolicy } from '../../../types';

export interface ValidationResults {
  [key: string]: Array<JSX.Element | string>;
}

export const agentPolicyFormValidation = (
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>
): ValidationResults => {
  const errors: ValidationResults = {};
  const namespaceValidation = isValidNamespace(agentPolicy.namespace || '');

  if (!agentPolicy.name?.trim()) {
    errors.name = [
      <FormattedMessage
        id="xpack.fleet.agentPolicyForm.nameRequiredErrorMessage"
        defaultMessage="Agent policy name is required"
      />,
    ];
  }

  if (!namespaceValidation.valid && namespaceValidation.error) {
    errors.namespace = [namespaceValidation.error];
  }

  if (agentPolicy.unenroll_timeout && agentPolicy.unenroll_timeout < 0) {
    errors.unenroll_timeout = [
      <FormattedMessage
        id="xpack.fleet.agentPolicyForm.unenrollTimeoutMinValueErrorMessage"
        defaultMessage="Timeout must be greater than zero."
      />,
    ];
  }

  return errors;
};
