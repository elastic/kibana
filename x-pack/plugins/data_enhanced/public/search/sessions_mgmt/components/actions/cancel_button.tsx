/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { TableText } from '../';
import { OnActionComplete } from './types';

interface CancelButtonProps {
  id: string;
  name: string;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
}

const CancelConfirm = ({
  onConfirmDismiss,
  ...props
}: CancelButtonProps & { onConfirmDismiss: () => void }) => {
  const { id, name, api, onActionComplete } = props;
  const [isLoading, setIsLoading] = useState(false);

  const title = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.title', {
    defaultMessage: 'Cancel search session',
  });
  const confirm = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.cancelButton', {
    defaultMessage: 'Cancel',
  });
  const cancel = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.dontCancelButton', {
    defaultMessage: 'Dismiss',
  });
  const message = i18n.translate('xpack.data.mgmt.searchSessions.cancelModal.message', {
    defaultMessage: `Canceling the search session \'{name}\' will expire any cached results, so that quick restore will no longer be available. You will still be able to re-run it, using the reload action.`,
    values: {
      name,
    },
  });

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={onConfirmDismiss}
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

export const CancelButton = (props: CancelButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const onClick = () => {
    setShowConfirm(true);
  };

  const onConfirmDismiss = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <TableText onClick={onClick}>
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionCancel"
          defaultMessage="Cancel"
        />
      </TableText>
      {showConfirm ? <CancelConfirm {...props} onConfirmDismiss={onConfirmDismiss} /> : null}
    </>
  );
};
