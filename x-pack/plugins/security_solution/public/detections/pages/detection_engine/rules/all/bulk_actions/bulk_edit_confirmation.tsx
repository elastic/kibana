/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from '../../translations';

interface BulkEditConfirmationProps {
  customRulesCount: number;
  elasticRulesCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}
const BulkEditConfirmationComponent = ({
  onCancel,
  onConfirm,
  customRulesCount,
  elasticRulesCount,
}: BulkEditConfirmationProps) => {
  useEffect(() => {
    if (elasticRulesCount === 0) {
      setTimeout(onConfirm, 0);
    }
  }, [elasticRulesCount, onConfirm]);

  // proceed straight to edit flyout if there is no Elastic rules
  if (elasticRulesCount === 0) {
    return null;
  }

  if (customRulesCount === 0) {
    return (
      <EuiConfirmModal
        title={i18n.BULK_EDIT_CONFIRMATION_TITLE(elasticRulesCount)}
        onCancel={onCancel}
        onConfirm={onCancel}
        confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
        defaultFocusedButton="confirm"
        data-test-subj="bulkEditRejectModal"
      >
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditRejectionDescription"
          defaultMessage="Elastic rules are not modifiable. The update action will only be applied to Custom rules."
        />
      </EuiConfirmModal>
    );
  }

  return (
    <EuiConfirmModal
      title={i18n.BULK_EDIT_CONFIRMATION_TITLE(elasticRulesCount)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CONFIRM}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkEditConfirmationModal"
    >
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditConfirmationDescription"
        defaultMessage="The update action will only be applied to {customRulesCount, plural, =1 {# Custom rule} other {# Custom rules}} you've selected."
        values={{ customRulesCount }}
      />
    </EuiConfirmModal>
  );
};

export const BulkEditConfirmation = React.memo(BulkEditConfirmationComponent);

BulkEditConfirmation.displayName = 'BulkEditConfirmation';
