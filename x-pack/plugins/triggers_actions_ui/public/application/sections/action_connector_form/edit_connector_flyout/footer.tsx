/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  isSaving: boolean;
  disabled: boolean;
  onCancel: () => void;
  onClose: () => void;
}

const FlyoutFooterComponent: React.FC<Props> = ({ isSaving, disabled, onCancel, onClose }) => {
  return (
    <EuiFlyoutFooter data-test-subj="edit-connector-flyout-footer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="edit-connector-flyout-cancel-btn">
            {i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.cancelButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="success"
                data-test-subj="edit-connector-flyout-save-close-btn"
                type="submit"
                isLoading={isSaving}
                onClick={onClose}
                disabled={disabled}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.editConnectorForm.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const FlyoutFooter = memo(FlyoutFooterComponent);
