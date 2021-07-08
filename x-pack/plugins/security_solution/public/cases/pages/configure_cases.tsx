/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { SecurityPageName } from '../../app/types';
import { getCaseUrl } from '../../common/components/link_to';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGetUserCasesPermissions, useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { navTabs } from '../../app/home/home_navigations';
import { CaseHeaderPage } from '../components/case_header_page';
import { WhitePageWrapper, SectionWrapper } from '../components/wrappers';
import * as i18n from './translations';
import { APP_ID } from '../../../common/constants';

const ConfigureCasesPageComponent: React.FC = () => {
  const {
    application: { navigateToApp },
    cases,
  } = useKibana().services;
  const userPermissions = useGetUserCasesPermissions();
  const search = useGetUrlSearch(navTabs.case);

  const backOptions = useMemo(
    () => ({
      path: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
      pageId: SecurityPageName.case,
    }),
    [search]
  );

  useEffect(() => {
    if (userPermissions != null && !userPermissions.read) {
      navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCaseUrl(search),
      });
    }
  }, [navigateToApp, userPermissions, search]);

  const HeaderWrapper = styled.div`
    padding-top: ${({ theme }) => theme.eui.paddingSizes.l};
  `;

  return (
    <>
      <SecuritySolutionPageWrapper noPadding>
        <SectionWrapper>
          <HeaderWrapper>
            <CaseHeaderPage title={i18n.CONFIGURE_CASES_PAGE_TITLE} backOptions={backOptions} />
          </HeaderWrapper>
        </SectionWrapper>
        <WhitePageWrapper>
          {cases.getConfigureCases({
            userCanCrud: userPermissions?.crud ?? false,
            owner: [APP_ID],
          })}
        </WhitePageWrapper>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.case} />
    </>
  );
};

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
