/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IClickActionDescriptor } from '../';
import extendSessionIcon from '../../icons/extend_session.svg';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { UISession } from '../../types';
import { DeleteButton } from './delete_button';
import { ExtendButton } from './extend_button';
import { InspectButton } from './inspect_button';
import { ACTION, OnActionComplete } from './types';

export const getAction = (
  api: SearchSessionsMgmtAPI,
  actionType: string,
  uiSession: UISession,
  onActionComplete: OnActionComplete
): IClickActionDescriptor | null => {
  const { id, name, expires } = uiSession;
  switch (actionType) {
    case ACTION.INSPECT:
      return {
        iconType: 'document',
        textColor: 'default',
        label: <InspectButton searchSession={uiSession} />,
      };

    case ACTION.DELETE:
      return {
        iconType: 'crossInACircleFilled',
        textColor: 'default',
        label: <DeleteButton api={api} id={id} name={name} onActionComplete={onActionComplete} />,
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
