/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmRuleClose: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmRuleClose.confirmRuleCloseTitle',
        {
          defaultMessage: 'Discard unsaved changes to rule?',
        }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmRuleClose.confirmRuleCloseConfirmButtonText',
        {
          defaultMessage: 'Discard changes',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmRuleClose.confirmRuleCloseCancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      defaultFocusedButton="confirm"
      data-test-subj="confirmRuleCloseModal"
    >
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.confirmRuleClose.confirmRuleCloseMessage"
          defaultMessage="You can't recover unsaved changes."
        />
      </p>
    </EuiConfirmModal>
  );
};
