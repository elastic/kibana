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
  showButtons: boolean;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onSubmitAndClose: () => void;
}

const FlyoutFooterComponent: React.FC<Props> = ({
  isSaving,
  showButtons,
  disabled,
  onCancel,
  onSubmit,
  onSubmitAndClose,
}) => {
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
            {showButtons ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="success"
                    data-test-subj="edit-connector-flyout-save-btn"
                    isLoading={isSaving}
                    onClick={onSubmit}
                    disabled={disabled}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.saveButtonLabel"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="success"
                    data-test-subj="edit-connector-flyout-save-close-btn"
                    type="submit"
                    isLoading={isSaving}
                    onClick={onSubmitAndClose}
                    disabled={disabled}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.saveAndCloseButtonLabel"
                      defaultMessage="Save & close"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const FlyoutFooter = memo(FlyoutFooterComponent);
