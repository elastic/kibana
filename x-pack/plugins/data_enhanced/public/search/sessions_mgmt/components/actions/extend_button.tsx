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
import { Duration } from 'moment';
import moment from 'moment';
import { CoreStart, OverlayRef } from 'kibana/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { TableText } from '../';
import { OnActionClick, OnActionComplete, OnActionDismiss } from './types';

interface ExtendButtonProps {
  id: string;
  name: string;
  expires: string | null;
  extendBy: Duration;
  api: SearchSessionsMgmtAPI;
  overlays: CoreStart['overlays'];
  onActionClick: OnActionClick;
  onActionComplete: OnActionComplete;
}

const ExtendConfirm = ({ ...props }: ExtendButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { id, name, expires, api, extendBy, onActionComplete, onActionDismiss } = props;
  const [isLoading, setIsLoading] = useState(false);
  const extendByDuration = moment.duration(extendBy);

  const newExpiration = moment(expires).add(extendByDuration);

  const title = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.title', {
    defaultMessage: 'Extend search session expiration',
  });
  const confirm = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.extendButton', {
    defaultMessage: 'Extend expiration',
  });
  const extend = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.dontExtendButton', {
    defaultMessage: 'Cancel',
  });
  const message = i18n.translate('xpack.data.mgmt.searchSessions.extendModal.extendMessage', {
    defaultMessage: "The search session '{name}' expiration would be extended until {newExpires}.",
    values: {
      name,
      newExpires: newExpiration.toLocaleString(),
    },
  });

  return (
    <EuiConfirmModal
      title={title}
      onCancel={onActionDismiss}
      onConfirm={async () => {
        setIsLoading(true);
        await api.sendExtend(id, `${newExpiration.toISOString()}`);
        setIsLoading(false);
        onActionDismiss();
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
  );
};

export const ExtendButton = (props: ExtendButtonProps) => {
  const { overlays, onActionClick } = props;

  return (
    <>
      <TableText
        onClick={() => {
          onActionClick();
          const ref = overlays.openModal(
            toMountPoint(<ExtendConfirm onActionDismiss={() => ref?.close()} {...props} />)
          );
        }}
      >
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionExtend"
          defaultMessage="Extend"
        />
      </TableText>
    </>
  );
};
