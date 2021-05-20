/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';

import { EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import * as i18n from '../../components/app/cases/translations';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { CASES_APP_ID, CASES_OWNER } from '../../components/app/cases/constants';
import { useKibana } from '../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../hooks/use_get_cases_user_permissions';

const ButtonEmpty = styled(EuiButtonEmpty)`
  display: block;
`;
function ConfigureCasesPageComponent() {
  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const userPermissions = useGetUserCasesPermissions();

  const goTo = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${CASES_APP_ID}`);
    },
    [navigateToApp]
  );

  if (userPermissions != null && !userPermissions.read) {
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
            {i18n.CONFIGURE_CASES_PAGE_TITLE} <ExperimentalBadge />
          </>
        ),
      }}
    >
      {cases.getConfigureCases({
        userCanCrud: userPermissions?.crud ?? false,
        owner: [CASES_OWNER],
      })}
    </EuiPageTemplate>
  );
}

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
