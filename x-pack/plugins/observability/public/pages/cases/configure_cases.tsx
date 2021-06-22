/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';

import { EuiButtonEmpty } from '@elastic/eui';
import * as i18n from '../../components/app/cases/translations';
import { CASES_APP_ID, CASES_OWNER } from '../../components/app/cases/constants';
import { useKibana } from '../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { casesBreadcrumbs, getCaseUrl, useFormatUrl } from './links';

const ButtonEmpty = styled(EuiButtonEmpty)`
  display: block;
`;
function ConfigureCasesPageComponent() {
  const {
    cases,
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;
  const casesUrl = getUrlForApp(CASES_APP_ID);
  const userPermissions = useGetUserCasesPermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  const onClickGoToCases = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToUrl(casesUrl);
    },
    [casesUrl, navigateToUrl]
  );
  const { formatUrl } = useFormatUrl(CASES_APP_ID);
  const href = formatUrl(getCaseUrl());
  useBreadcrumbs([{ ...casesBreadcrumbs.cases, href }, casesBreadcrumbs.configure]);
  if (userPermissions != null && !userPermissions.read) {
    navigateToUrl(casesUrl);
    return null;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            <ButtonEmpty
              onClick={onClickGoToCases}
              iconType="arrowLeft"
              iconSide="left"
              flush="left"
            >
              {i18n.BACK_TO_ALL}
            </ButtonEmpty>
            {i18n.CONFIGURE_CASES_PAGE_TITLE}
          </>
        ),
      }}
    >
      {cases.getConfigureCases({
        userCanCrud: userPermissions?.crud ?? false,
        owner: [CASES_OWNER],
      })}
    </ObservabilityPageTemplate>
  );
}

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
