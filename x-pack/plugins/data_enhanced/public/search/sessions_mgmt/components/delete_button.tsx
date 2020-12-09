/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { ActionComplete } from '../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { TableText } from './';

interface DeleteButtonProps {
  id: string;
  api: SearchSessionsMgmtAPI;
  actionComplete: ActionComplete;
}

const DeleteConfirm = ({
  onConfirmDismiss,
  ...props
}: DeleteButtonProps & { onConfirmDismiss: () => void }) => {
  const { id, api, actionComplete } = props;
  const [isLoading, setIsLoading] = useState(false);

  const title = i18n.translate('xpack.data.mgmt.searchSessions.deleteModal.title', {
    defaultMessage: 'Are you sure you want to delete the session?',
  });
  const confirm = i18n.translate('xpack.data.mgmt.searchSessions.deleteModal.deleteButton', {
    defaultMessage: 'Delete',
  });
  const cancel = i18n.translate('xpack.data.mgmt.searchSessions.deleteModal.cancelButton', {
    defaultMessage: 'Cancel',
  });
  const message = i18n.translate('xpack.data.mgmt.searchSessions.deleteModal.message', {
    defaultMessage: `You can't recover deleted sessions`,
  });

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={onConfirmDismiss}
        onConfirm={async () => {
          setIsLoading(true);
          actionComplete(await api.sendDelete(id));
        }}
        confirmButtonText={confirm}
        confirmButtonDisabled={isLoading}
        cancelButtonText={cancel}
        defaultFocusedButton="confirm"
        buttonColor="danger"
      >
        {message}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

export const DeleteButton = (props: DeleteButtonProps) => {
  const [toShowDeleteConfirm, setToShowDeleteConfirm] = useState(false);

  const onClick = () => {
    setToShowDeleteConfirm(true);
  };

  const onConfirmDismiss = () => {
    setToShowDeleteConfirm(false);
  };

  return (
    <>
      <TableText onClick={onClick}>
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionDelete"
          defaultMessage="Delete"
        />
      </TableText>
      {toShowDeleteConfirm ? (
        <DeleteConfirm {...props} onConfirmDismiss={onConfirmDismiss} />
      ) : null}
    </>
  );
};
