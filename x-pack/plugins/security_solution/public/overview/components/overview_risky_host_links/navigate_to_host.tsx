/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiText, EuiToolTip } from '@elastic/eui';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';

export const NavigateToHost: React.FC<{ name: string }> = ({ name }): JSX.Element => {
  const { navigateToApp } = useKibana().services.application;
  const { filterManager } = useKibana().services.data.query;

  const goToHostPage = useCallback(
    (e) => {
      e.preventDefault();
      filterManager.addFilters([
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { match_phrase: { 'host.name': name } },
        },
      ]);
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
      });
    },
    [filterManager, name, navigateToApp]
  );
  return (
    <EuiToolTip content={name} position="top">
      <EuiButtonEmpty color="text" onClick={goToHostPage} size="xs">
        <EuiText size="s">{name}</EuiText>
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
