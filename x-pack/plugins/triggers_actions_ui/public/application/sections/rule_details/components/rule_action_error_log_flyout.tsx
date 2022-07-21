/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { IExecutionLog } from '@kbn/alerting-plugin/common';
import { Rule } from '../../../../types';
import { RuleErrorLogWithApi } from './rule_error_log';
import { RuleActionErrorBadge } from './rule_action_error_badge';

export interface RuleActionErrorLogFlyoutProps {
  rule: Rule;
  runLog: IExecutionLog;
  refreshToken?: number;
  onClose: () => void;
}

export const RuleActionErrorLogFlyout = (props: RuleActionErrorLogFlyoutProps) => {
  const { rule, runLog, refreshToken, onClose } = props;

  const { id, message, num_errored_actions: totalErrors } = runLog;

  return (
    <EuiFlyout type="push" onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.actionErrors"
              defaultMessage="Errored Actions"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSpacer />
        <EuiText>{message}</EuiText>
        <EuiSpacer />
        <div>
          <RuleActionErrorBadge totalErrors={totalErrors} />
          &nbsp;
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.actionErrors"
            defaultMessage="Errored Action(s)"
          />
        </div>
        <RuleErrorLogWithApi rule={rule} runId={id} refreshToken={refreshToken} />
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={onClose}>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.close"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
