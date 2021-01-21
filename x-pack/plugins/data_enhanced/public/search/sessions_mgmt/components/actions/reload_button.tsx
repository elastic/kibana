/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { TableText } from '../';
import { SearchSessionsMgmtAPI } from '../../lib/api';

interface ReloadButtonProps {
  api: SearchSessionsMgmtAPI;
  reloadUrl: string;
}

export const ReloadButton = (props: ReloadButtonProps) => {
  function onClick() {
    props.api.reloadSearchSession(props.reloadUrl);
  }

  return (
    <>
      <TableText onClick={onClick}>
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.actionReload"
          defaultMessage="Reload"
        />
      </TableText>
    </>
  );
};
