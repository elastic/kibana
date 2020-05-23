/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';

import { getCaseUrl } from '../../components/link_to';
import { useGetUrlSearch } from '../../components/navigation/use_get_url_search';
import { WrapperPage } from '../../components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../lib/kibana';
import { SpyRoute } from '../../utils/route/spy_routes';
import { navTabs } from '../home/home_navigations';
import { CaseHeaderPage } from './components/case_header_page';
import { ConfigureCases } from './components/configure_cases';
import { WhitePageWrapper, SectionWrapper } from './components/wrappers';
import * as i18n from './translations';

const wrapperPageStyle: Record<string, string> = {
  paddingLeft: '0',
  paddingRight: '0',
  paddingBottom: '0',
};

const ConfigureCasesPageComponent: React.FC = () => {
  const userPermissions = useGetUserSavedObjectPermissions();
  const search = useGetUrlSearch(navTabs.case);

  const backOptions = useMemo(
    () => ({
      href: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
    }),
    [search]
  );

  if (userPermissions != null && !userPermissions.read) {
    return <Redirect to={getCaseUrl(search)} />;
  }

  return (
    <>
      <WrapperPage style={wrapperPageStyle}>
        <SectionWrapper>
          <CaseHeaderPage title={i18n.CONFIGURE_CASES_PAGE_TITLE} backOptions={backOptions} />
        </SectionWrapper>
        <WhitePageWrapper>
          <ConfigureCases userCanCrud={userPermissions?.crud ?? false} />
        </WhitePageWrapper>
      </WrapperPage>
      <SpyRoute />
    </>
  );
};

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
