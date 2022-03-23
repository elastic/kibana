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
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { CoreStart } from 'kibana/public';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { IClickActionDescriptor } from '../';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { OnActionDismiss } from './types';
import { UISession } from '../../types';

interface RenameButtonProps {
  searchSession: UISession;
  api: SearchSessionsMgmtAPI;
}

const RenameDialog = ({
  onActionDismiss,
  ...props
}: RenameButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { api, searchSession } = props;
  const { id, name: originalName } = searchSession;
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
        <EuiButtonEmpty onClick={onActionDismiss} data-test-subj="cancelEditName">
          {cancel}
        </EuiButtonEmpty>

        <EuiButton
          disabled={!isNewNameValid}
          onClick={async () => {
            if (!isNewNameValid) return;
            setIsLoading(true);
            await api.sendRename(id, newName);
            setIsLoading(false);
            onActionDismiss();
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

export const createRenameActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: 'pencil',
  label: (
    <FormattedMessage id="xpack.data.mgmt.searchSessions.actionRename" defaultMessage="Edit name" />
  ),
  onClick: async () => {
    const ref = core.overlays.openModal(
      toMountPoint(
        <RenameDialog onActionDismiss={() => ref?.close()} api={api} searchSession={uiSession} />,
        { theme$: core.theme.theme$ }
      )
    );
    await ref.onClose;
  },
});
