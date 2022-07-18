/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiModal, EuiModalBody, EuiSpacer, EuiText } from '@elastic/eui';
import { IExecutionLog } from '@kbn/alerting-plugin/common';
import { Rule } from '../../../../types';
import { RuleErrorLogWithApi } from './rule_error_log';
import { RuleActionErrorBadge } from './rule_action_error_badge';

export interface RuleActionErrorLogModalProps {
  rule: Rule;
  runLog: IExecutionLog;
  refreshToken?: number;
  onClose: () => void;
}

export const RuleActionErrorLogModal = (props: RuleActionErrorLogModalProps) => {
  const { rule, runLog, refreshToken, onClose } = props;

  const { id, message, num_errored_actions: totalErrors } = runLog;

  return (
    <EuiModal onClose={onClose}>
      <EuiModalBody>
        <EuiSpacer />
        <EuiText>{message}</EuiText>
        <EuiSpacer />
        <div>
          <RuleActionErrorBadge totalErrors={totalErrors} />
          &nbsp;Action errors
        </div>
        <RuleErrorLogWithApi rule={rule} runId={id} refreshToken={refreshToken} />
        <EuiSpacer />
      </EuiModalBody>
    </EuiModal>
  );
};
