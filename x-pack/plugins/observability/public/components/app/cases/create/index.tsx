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
import { CASES_OWNER } from '../constants';
import { observabilityAppId } from '../../../../../common';

export const Create = React.memo(() => {
  const {
    cases,
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;
  const casesUrl = `${getUrlForApp(observabilityAppId)}/cases`;
  const onSuccess = useCallback(
    async ({ id }) => navigateToUrl(`${casesUrl}${getCaseDetailsUrl({ id })}`),
    [casesUrl, navigateToUrl]
  );

  const handleSetIsCancel = useCallback(
    () => navigateToUrl(`${casesUrl}`),
    [casesUrl, navigateToUrl]
  );

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
