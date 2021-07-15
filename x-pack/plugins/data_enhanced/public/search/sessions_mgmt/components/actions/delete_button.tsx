/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { CoreStart, OverlayRef } from 'kibana/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { TableText } from '../';
import { OnActionClick, OnActionComplete, OnActionDismiss } from './types';

interface DeleteButtonProps {
  id: string;
  name: string;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
  overlays: CoreStart['overlays'];
  onActionClick: OnActionClick;
}

const DeleteConfirm = (props: DeleteButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { id, name, api, onActionComplete, onActionDismiss } = props;
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
    <EuiConfirmModal
      title={title}
      onCancel={onActionDismiss}
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
  );
};

export const DeleteButton = (props: DeleteButtonProps) => {
  const { overlays, onActionClick } = props;

  return (
    <>
      <TableText
        onClick={() => {
          onActionClick();
          const ref = overlays.openModal(
            toMountPoint(<DeleteConfirm onActionDismiss={() => ref?.close()} {...props} />)
          );
        }}
      >
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionDelete"
          defaultMessage="Delete"
        />
      </TableText>
    </>
  );
};
