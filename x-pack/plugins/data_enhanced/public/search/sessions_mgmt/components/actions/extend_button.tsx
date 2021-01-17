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

interface ExtendButtonProps {
  id: string;
  name: string;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
}

const ExtendConfirm = ({
  onConfirmDismiss,
  ...props
}: ExtendButtonProps & { onConfirmDismiss: () => void }) => {
  const { id, name, api, onActionComplete } = props;
  const [isLoading, setIsLoading] = useState(false);

  const title = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.title', {
    defaultMessage: 'Extend search session expiration',
  });
  const confirm = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.extendButton', {
    defaultMessage: 'Extend',
  });
  const extend = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.dontExtendButton', {
    defaultMessage: 'Cancel',
  });
  const message = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.extendMessage', {
    defaultMessage: "When would you like the search session '{name}' to expire?",
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
          await api.sendExtend(id, '1');
          onActionComplete();
        }}
        confirmButtonText={confirm}
        confirmButtonDisabled={isLoading}
        cancelButtonText={extend}
        defaultFocusedButton="confirm"
        buttonColor="primary"
      >
        {message}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

export const ExtendButton = (props: ExtendButtonProps) => {
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
          id="xpack.data.mgmt.searchSessions.actionExtend"
          defaultMessage="Extend"
        />
      </TableText>
      {showConfirm ? <ExtendConfirm {...props} onConfirmDismiss={onConfirmDismiss} /> : null}
    </>
  );
};
