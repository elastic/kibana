/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHealthContext } from '../../context/health_context';

interface AlertAddFooterProps {
  isSaving: boolean;
  isFormLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const AlertAddFooter = ({
  isSaving,
  onSave,
  onCancel,
  isFormLoading,
}: AlertAddFooterProps) => {
  const { loadingHealthCheck } = useHealthContext();

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty data-test-subj="cancelSaveAlertButton" onClick={onCancel}>
            {i18n.translate('xpack.triggersActionsUI.sections.alertAddFooter.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {isFormLoading ? (
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        ) : (
          <></>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="secondary"
            data-test-subj="saveAlertButton"
            type="submit"
            iconType="check"
            isDisabled={loadingHealthCheck}
            isLoading={isSaving}
            onClick={onSave}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertAddFooter.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertAddFooter as default };
