/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';

import { useKibana } from '../../../../utils/kibana_react';
import { getCaseDetailsUrl } from '../../../../pages/cases/links';
import { CASES_APP_ID, CASES_OWNER } from '../constants';

export const Create = React.memo(() => {
  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const onSuccess = useCallback(
    async ({ id }) =>
      navigateToApp(`${CASES_APP_ID}`, {
        path: getCaseDetailsUrl({ id }),
      }),
    [navigateToApp]
  );

  const handleSetIsCancel = useCallback(() => navigateToApp(`${CASES_APP_ID}`), [navigateToApp]);

  return (
    <EuiPanel>
      {cases.getCreateCase({
        disableAlerts: true,
        onCancel: handleSetIsCancel,
        onSuccess,
        owner: [CASES_OWNER],
      })}
    </EuiPanel>
  );
});

Create.displayName = 'Create';
