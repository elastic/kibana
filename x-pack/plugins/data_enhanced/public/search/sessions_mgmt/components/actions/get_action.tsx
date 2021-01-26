/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IClickActionDescriptor } from '../';
import extendSessionIcon from '../../icons/extend_session.svg';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { UISession } from '../../types';
import { CancelButton } from './cancel_button';
import { ExtendButton } from './extend_button';
import { ReloadButton } from './reload_button';
import { ACTION, OnActionComplete } from './types';

export const getAction = (
  api: SearchSessionsMgmtAPI,
  actionType: string,
  { id, name, expires, reloadUrl }: UISession,
  onActionComplete: OnActionComplete
): IClickActionDescriptor | null => {
  switch (actionType) {
    case ACTION.CANCEL:
      return {
        iconType: 'crossInACircleFilled',
        textColor: 'default',
        label: <CancelButton api={api} id={id} name={name} onActionComplete={onActionComplete} />,
      };

    case ACTION.RELOAD:
      return {
        iconType: 'refresh',
        textColor: 'default',
        label: <ReloadButton api={api} reloadUrl={reloadUrl} />,
      };

    case ACTION.EXTEND:
      return {
        iconType: extendSessionIcon,
        textColor: 'default',
        label: (
          <ExtendButton
            api={api}
            id={id}
            name={name}
            expires={expires}
            extendBy={api.getExtendByDuration()}
            onActionComplete={onActionComplete}
          />
        ),
      };

    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown action: ${actionType}`);
  }

  // Unknown action: do not show

  return null;
};
