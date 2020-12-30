/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { SecurityPageName } from '../../app/types';
import { getCaseUrl } from '../../common/components/link_to';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { navTabs } from '../../app/home/home_navigations';
import { CaseHeaderPage } from '../components/case_header_page';
import { ConfigureCases } from '../components/configure_cases';
import { WhitePageWrapper, SectionWrapper } from '../components/wrappers';
import * as i18n from './translations';

const ConfigureCasesPageComponent: React.FC = () => {
  const history = useHistory();
  const userPermissions = useGetUserSavedObjectPermissions();
  const search = useGetUrlSearch(navTabs.case);

  const backOptions = useMemo(
    () => ({
      href: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
      pageId: SecurityPageName.case,
    }),
    [search]
  );

  if (userPermissions != null && !userPermissions.read) {
    history.push(getCaseUrl(search));
    return null;
  }

  const HeaderWrapper = styled.div`
    padding-top: ${({ theme }) => theme.eui.paddingSizes.l};
  `;

  return (
    <>
      <WrapperPage noPadding>
        <SectionWrapper>
          <HeaderWrapper>
            <CaseHeaderPage title={i18n.CONFIGURE_CASES_PAGE_TITLE} backOptions={backOptions} />
          </HeaderWrapper>
        </SectionWrapper>
        <WhitePageWrapper>
          <ConfigureCases userCanCrud={userPermissions?.crud ?? false} />
        </WhitePageWrapper>
      </WrapperPage>
      <SpyRoute pageName={SecurityPageName.case} />
    </>
  );
};

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
