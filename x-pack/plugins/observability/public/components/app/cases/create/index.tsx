/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

import { useKibana } from '../../../../utils/kibana_react';
import { getCaseDetailsUrl, getCreateCaseUrl } from '../../../../pages/cases/links';
import { CASES_APP_ID, CASES_OWNER } from '../constants';

export const Create = React.memo(() => {
  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const history = useHistory();
  const onSuccess = useCallback(
    async ({ id }) => {
      navigateToApp(`${CASES_APP_ID}`, {
        path: getCaseDetailsUrl({ id }),
      });
    },
    [navigateToApp]
  );

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  return (
    <EuiPanel>
      {cases.getCreateCase({
        onCancel: handleSetIsCancel,
        onSuccess,
        owner: [CASES_OWNER],
      })}
    </EuiPanel>
  );
});

Create.displayName = 'Create';
