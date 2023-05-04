/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorUserAction } from '../../../common/api';
import { NONE_CONNECTOR_ID } from '../../../common/api';
import type { UserActionBuilder, UserActionResponse } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const getLabelTitle = (userAction: UserActionResponse<ConnectorUserAction>) => {
  const connector = userAction.payload.connector;

  if (connector == null) {
    return '';
  }

  if (connector.id === NONE_CONNECTOR_ID) {
    return i18n.REMOVED_THIRD_PARTY;
  }

  return i18n.SELECTED_THIRD_PARTY(connector.name);
};

export const createConnectorUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const connectorUserAction = userAction as UserActionResponse<ConnectorUserAction>;
    const label = getLabelTitle(connectorUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
