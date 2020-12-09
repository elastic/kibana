/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { IClickActionDescriptor } from '../';
import { ACTION, ActionComplete, UISession } from '../../../../../common/search/sessions_mgmt';
import extendSessionIcon from '../../icons/extend_session.svg';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { DeleteButton } from '../delete_button';

export const getAction = (
  api: SearchSessionsMgmtAPI,
  actionType: string,
  { id }: UISession,
  actionComplete: ActionComplete
): IClickActionDescriptor | null => {
  switch (actionType) {
    //
    case ACTION.CANCEL:
      return {
        iconType: 'crossInACircleFilled',
        textColor: 'default',
        label: i18n.translate('xpack.data.mgmt.searchSessions.actionCancel', {
          defaultMessage: 'Cancel',
        }),
      };

    //
    case ACTION.DELETE:
      return {
        iconType: 'trash',
        textColor: 'danger',
        label: <DeleteButton api={api} id={id} actionComplete={actionComplete} />,
      };

    //
    case ACTION.EXTEND:
      return {
        iconType: extendSessionIcon,
        textColor: 'default',
        label: i18n.translate('xpack.data.mgmt.searchSessions.actionExtend', {
          defaultMessage: 'Extend',
        }),
      };

    //
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown action: ${actionType}`);
  }

  // Unknown action: do not show

  return null;
};
