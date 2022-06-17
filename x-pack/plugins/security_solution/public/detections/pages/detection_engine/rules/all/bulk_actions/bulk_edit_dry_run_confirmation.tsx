/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from '../../translations';
import { DryRunResult } from './use_bulk_actions_dry_run';

interface BulkEditDryRunConfirmationProps {
  result?: DryRunResult;
  onCancel: () => void;
  onConfirm: () => void;
}
const BulkEditDryRunConfirmationComponent = ({
  onCancel,
  onConfirm,
  result,
}: BulkEditDryRunConfirmationProps) => {
  const hasAllSucceeded = result?.summary?.failed === 0;
  const { total = 0, failed = 0, succeeded = 0 } = result?.summary ?? {};
  useEffect(() => {
    if (hasAllSucceeded) {
      setTimeout(onConfirm, 0);
    }
  }, [hasAllSucceeded, onConfirm]);

  // proceed straight to edit flyout if all rules can be edited successfully
  if (hasAllSucceeded) {
    return null;
  }

  const formatRuleEditErrors = (
    <>
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.actionRejectionDescription"
        defaultMessage="This action can't be applied to the following rules:"
      />
      <EuiSpacer />
      <ul>
        {result?.failed.map(({ message, rulesCount }) => {
          switch (message) {
            case 'Immutable':
              return (
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.elasticRulesEditDescription"
                    defaultMessage="{rulesCount, plural, =1 {# prebuild Elastic rule} other {# prebuild Elastic rules}}(editing prebuilt rules is not supported)"
                    values={{ rulesCount }}
                  />
                </li>
              );
            case 'ML rule cant have index':
              return (
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.machineLearningRulesIndexEditDescription"
                    defaultMessage="{rulesCount, plural, =1 {# custom Machine Learning rule} other {# custom Machine Learning rules}}(these rules don't have index patterns)"
                    values={{ rulesCount }}
                  />
                </li>
              );
            default:
              return (
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.defaultRulesEditFailureDescription"
                    defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} can't be edited due to error: {message}"
                    values={{ rulesCount, message }}
                  />
                </li>
              );
          }
        })}
      </ul>
    </>
  );

  if (succeeded === 0) {
    return (
      <EuiConfirmModal
        title={i18n.BULK_EDIT_CONFIRMATION_DENIED_TITLE(total)}
        onCancel={onCancel}
        onConfirm={onCancel}
        confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CLOSE}
        defaultFocusedButton="confirm"
        data-test-subj="bulkEditRejectModal"
      >
        {formatRuleEditErrors}
      </EuiConfirmModal>
    );
  }

  return (
    <EuiConfirmModal
      title={i18n.BULK_EDIT_CONFIRMATION_PARTLY_TITLE(succeeded)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CONFIRM}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkEditConfirmationModal"
    >
      {formatRuleEditErrors}
    </EuiConfirmModal>
  );
};

export const BulkEditDryRunConfirmation = React.memo(BulkEditDryRunConfirmationComponent);

BulkEditDryRunConfirmation.displayName = 'BulkEditDryRunConfirmation';
