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
import { CoreStart, OverlayRef } from 'kibana/public';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { TableText } from '../';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { OnActionClick, OnActionComplete, OnActionDismiss } from './types';

interface RenameButtonProps {
  id: string;
  name: string;
  api: SearchSessionsMgmtAPI;
  overlays: CoreStart['overlays'];
  onActionComplete: OnActionComplete;
  onActionClick: OnActionClick;
}

const RenameDialog = ({
  onActionDismiss,
  ...props
}: RenameButtonProps & { onActionDismiss: OnActionDismiss }) => {
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
    <EuiModal onClose={onActionDismiss} initialFocus="[name=newName]">
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
        <EuiButtonEmpty onClick={onActionDismiss}>{cancel}</EuiButtonEmpty>

        <EuiButton
          disabled={!isNewNameValid}
          onClick={async () => {
            if (!isNewNameValid) return;
            setIsLoading(true);
            await api.sendRename(id, newName);
            setIsLoading(false);
            onActionDismiss();
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
  const { overlays, onActionClick } = props;

  const onClick = () => {
    onActionClick();
    const ref = overlays.openModal(
      toMountPoint(<RenameDialog onActionDismiss={() => ref?.close()} {...props} />)
    );
  };

  return (
    <>
      <TableText onClick={onClick}>
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionRename"
          defaultMessage="Edit name"
        />
      </TableText>
    </>
  );
};
