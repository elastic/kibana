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
import { CoreStart } from 'kibana/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { IClickActionDescriptor } from '../';
import { OnActionDismiss } from './types';
import { UISession } from '../../types';

interface DeleteButtonProps {
  api: SearchSessionsMgmtAPI;
  searchSession: UISession;
}

const DeleteConfirm = (props: DeleteButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { searchSession, api, onActionDismiss } = props;
  const { name, id } = searchSession;
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
        onActionDismiss();
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

export const createDeleteActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: 'crossInACircleFilled',
  label: (
    <FormattedMessage id="xpack.data.mgmt.searchSessions.actionDelete" defaultMessage="Delete" />
  ),
  onClick: async () => {
    const ref = core.overlays.openModal(
      toMountPoint(
        <DeleteConfirm onActionDismiss={() => ref?.close()} searchSession={uiSession} api={api} />
      )
    );
    await ref.onClose;
  },
});
