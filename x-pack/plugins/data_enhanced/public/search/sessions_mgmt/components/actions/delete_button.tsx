/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { TableText } from '../';
import { OnActionComplete } from './types';

interface DeleteButtonProps {
  id: string;
  name: string;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
}

const DeleteConfirm = ({
  onConfirmCancel,
  ...props
}: DeleteButtonProps & { onConfirmCancel: () => void }) => {
  const { id, name, api, onActionComplete } = props;
  const [isLoading, setIsLoading] = useState(false);

  const title = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.title', {
    defaultMessage: 'Delete search session',
  });
  const confirm = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.deleteButton', {
    defaultMessage: 'Delete',
  });
  const cancel = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.cancelButton', {
    defaultMessage: 'Cancel',
  });
  const message = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.message', {
    defaultMessage: `Deleting the search session \'{name}\' deletes all cached results.`,
    values: {
      name,
    },
  });

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={onConfirmCancel}
        onConfirm={async () => {
          setIsLoading(true);
          await api.sendCancel(id);
          onActionComplete();
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
  const [showConfirm, setShowConfirm] = useState(false);

  const onClick = () => {
    setShowConfirm(true);
  };

  const onConfirmCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <TableText onClick={onClick}>
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionDelete"
          defaultMessage="Delete"
        />
      </TableText>
      {showConfirm ? <DeleteConfirm {...props} onConfirmCancel={onConfirmCancel} /> : null}
    </>
  );
};
