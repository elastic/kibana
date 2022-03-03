/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import moment from 'moment';
import { CoreStart } from 'kibana/public';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { IClickActionDescriptor } from '../';
import { OnActionDismiss } from './types';
import { UISession } from '../../types';
import extendSessionIcon from '../../icons/extend_session.svg';

interface ExtendButtonProps {
  searchSession: UISession;
  api: SearchSessionsMgmtAPI;
}

const ExtendConfirm = ({ ...props }: ExtendButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { searchSession, api, onActionDismiss } = props;
  const { id, name, expires } = searchSession;
  const [isLoading, setIsLoading] = useState(false);
  const extendByDuration = moment.duration(api.getExtendByDuration());

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

export const createExtendActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: extendSessionIcon,
  label: (
    <FormattedMessage id="xpack.data.mgmt.searchSessions.actionExtend" defaultMessage="Extend" />
  ),
  onClick: async () => {
    const ref = core.overlays.openModal(
      toMountPoint(
        <ExtendConfirm onActionDismiss={() => ref?.close()} searchSession={uiSession} api={api} />,
        { theme$: core.theme.theme$ }
      )
    );
    await ref.onClose;
  },
});
