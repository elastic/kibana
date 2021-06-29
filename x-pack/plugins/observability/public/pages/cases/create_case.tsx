/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../../components/app/cases/translations';
import { Create } from '../../components/app/cases/create';
import { useKibana } from '../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { casesBreadcrumbs, getCaseUrl, useFormatUrl } from './links';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { observabilityAppId } from '../../../common';

const ButtonEmpty = styled(EuiButtonEmpty)`
  display: block;
`;
ButtonEmpty.displayName = 'ButtonEmpty';
export const CreateCasePage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;

  const casesUrl = `${getUrlForApp(observabilityAppId)}/cases`;
  const goTo = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToUrl(casesUrl);
    },
    [casesUrl, navigateToUrl]
  );

  const { formatUrl } = useFormatUrl();
  const href = formatUrl(getCaseUrl());
  useBreadcrumbs([{ ...casesBreadcrumbs.cases, href }, casesBreadcrumbs.create]);

  useEffect(() => {
    if (userPermissions != null && !userPermissions.crud) {
      navigateToUrl(casesUrl);
    }
  }, [casesUrl, navigateToUrl, userPermissions]);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            <ButtonEmpty onClick={goTo} iconType="arrowLeft" iconSide="left" flush="left">
              {i18n.BACK_TO_ALL}
            </ButtonEmpty>
            {i18n.CREATE_TITLE}
          </>
        ),
      }}
    >
      <Create />
    </ObservabilityPageTemplate>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
