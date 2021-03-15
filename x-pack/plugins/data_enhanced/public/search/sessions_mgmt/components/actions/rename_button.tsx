/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { TableText } from '../';
import { OnActionComplete } from './types';

interface RenameButtonProps {
  id: string;
  name: string;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
}

const RenameDialog = ({ onDismiss, ...props }: RenameButtonProps & { onDismiss: () => void }) => {
  const { id, name: originalName, api, onActionComplete } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState(originalName);

  const title = i18n.translate('xpack.data.mgmt.searchSessions.renameModal.title', {
    defaultMessage: 'Edit search session name',
  });
  const confirm = i18n.translate('xpack.data.mgmt.searchSessions.renameModal.renameButton', {
    defaultMessage: 'Save',
  });
  const cancel = i18n.translate('xpack.data.mgmt.searchSessions.renameModal.cancelButton', {
    defaultMessage: 'Cancel',
  });

  const label = i18n.translate(
    'xpack.data.mgmt.searchSessions.renameModal.searchSessionNameInputLabel',
    {
      defaultMessage: 'Search session name',
    }
  );

  const isNewNameValid = newName && originalName !== newName;

  return (
    <EuiModal onClose={onDismiss} initialFocus="[name=newName]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow label={label}>
            <EuiFieldText
              name="newName"
              placeholder={originalName}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onDismiss}>{cancel}</EuiButtonEmpty>

        <EuiButton
          disabled={!isNewNameValid}
          onClick={async () => {
            if (!isNewNameValid) return;
            setIsLoading(true);
            await api.sendRename(id, newName);
            setIsLoading(false);
            onDismiss();
            onActionComplete();
          }}
          fill
          isLoading={isLoading}
        >
          {confirm}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const RenameButton = (props: RenameButtonProps) => {
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const onClick = () => {
    setShowRenameDialog(true);
  };

  const onDismiss = () => {
    setShowRenameDialog(false);
  };

  return (
    <>
      <TableText onClick={onClick}>
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionRename"
          defaultMessage="Edit name"
        />
      </TableText>
      {showRenameDialog ? <RenameDialog {...props} onDismiss={onDismiss} /> : null}
    </>
  );
};
