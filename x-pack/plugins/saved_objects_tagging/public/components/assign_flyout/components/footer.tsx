/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface AssignFlyoutFooterProps {
  isSaving: boolean;
  hasPendingChanges: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const AssignFlyoutFooter: FC<AssignFlyoutFooterProps> = ({
  isSaving,
  hasPendingChanges,
  onCancel,
  onSave,
}) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="assignFlyoutCancelButton">
          <FormattedMessage
            id="xpack.savedObjectsTagging.assignFlyout.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSave}
          isLoading={isSaving}
          disabled={!hasPendingChanges}
          fill
          iconType="save"
          data-test-subj="assignFlyoutConfirmButton"
        >
          <FormattedMessage
            id="xpack.savedObjectsTagging.assignFlyout.confirmButtonLabel"
            defaultMessage="Save tag assignments"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
