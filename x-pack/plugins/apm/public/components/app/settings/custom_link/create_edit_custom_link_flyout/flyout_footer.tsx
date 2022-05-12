/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DeleteButton } from './delete_button';

export function FlyoutFooter({
  onClose,
  isSaving,
  onDelete,
  customLinkId,
  isSaveButtonEnabled,
}: {
  onClose: () => void;
  isSaving: boolean;
  onDelete: () => void;
  customLinkId?: string;
  isSaveButtonEnabled: boolean;
}) {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            {i18n.translate('xpack.apm.settings.customLink.flyout.close', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ display: 'block' }}>
          {customLinkId && (
            <DeleteButton customLinkId={customLinkId} onDelete={onDelete} />
          )}
          <EuiButton
            form="customLink_form"
            fill
            type="submit"
            isLoading={isSaving}
            isDisabled={!isSaveButtonEnabled}
          >
            {i18n.translate('xpack.apm.settings.customLink.flyout.save', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
