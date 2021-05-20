/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../../components/app/cases/translations';
import { Create } from '../../components/app/cases/create';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { CASES_APP_ID } from '../../components/app/cases/constants';
import { useKibana } from '../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../hooks/use_get_cases_user_permissions';

const ButtonEmpty = styled(EuiButtonEmpty)`
  display: block;
`;
ButtonEmpty.displayName = 'ButtonEmpty';
export const CreateCasePage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const {
    application: { navigateToApp },
  } = useKibana().services;

  const goTo = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${CASES_APP_ID}`);
    },
    [navigateToApp]
  );

  if (userPermissions != null && !userPermissions.crud) {
    navigateToApp(`${CASES_APP_ID}`);
    return null;
  }

  return (
    <EuiPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            <ButtonEmpty onClick={goTo} iconType="arrowLeft" iconSide="left" flush="left">
              {i18n.BACK_TO_ALL}
            </ButtonEmpty>
            {i18n.CREATE_TITLE} <ExperimentalBadge />
          </>
        ),
      }}
    >
      <Create />
    </EuiPageTemplate>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
