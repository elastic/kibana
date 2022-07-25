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
  buttonType: 'back' | 'cancel';
  onSubmit: () => Promise<void>;
  onTestConnector?: () => void;
  onBack: () => void;
  onCancel: () => void;
}

const FlyoutFooterComponent: React.FC<Props> = ({
  isSaving,
  disabled,
  buttonType,
  onCancel,
  onBack,
  onTestConnector,
  onSubmit,
}) => {
  return (
    <EuiFlyoutFooter data-test-subj="create-connector-flyout-footer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {buttonType === 'back' ? (
            <EuiButtonEmpty onClick={onBack} data-test-subj="create-connector-flyout-back-btn">
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorAdd.backButtonLabel',
                {
                  defaultMessage: 'Back',
                }
              )}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty data-test-subj="create-connector-flyout-cancel-btn" onClick={onCancel}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorAdd.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <>
              {onTestConnector && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="success"
                    data-test-subj="create-connector-flyout-save-test-btn"
                    type="submit"
                    isLoading={isSaving}
                    disabled={disabled}
                    onClick={onTestConnector}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveAndTestButtonLabel"
                      defaultMessage="Save & test"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="success"
                  data-test-subj="create-connector-flyout-save-btn"
                  type="submit"
                  isLoading={isSaving}
                  disabled={disabled}
                  onClick={onSubmit}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const FlyoutFooter = memo(FlyoutFooterComponent);
