/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecurityPageName } from '../../../../common';
import { useLinkInfo } from '../../links';
import { NoPrivilegesPage } from '../no_privileges';
import { useUpsellingPage } from '../../hooks/use_upselling';
import { SpyRoute } from '../../utils/route/spy_routes';

interface SecurityRoutePageWrapperProps {
  pageName: SecurityPageName;
  redirectOnMissing?: boolean;
}

/**
 * This component is created to wrap all the pages in the security solution app.
 *
 * It handles application tracking and upselling.
 *
 * When using this component make sure it render bellow `SecurityPageWrapper` and
 * that you removed the `TrackApplicationView` component.
 *
 * Ex:
 * ```
 * <PluginTemplateWrapper>
 *   <SecurityRoutePageWrapper pageName={SecurityPageName.myPage}>
 *     <MyPage />
 *   </SecurityRoutePageWrapper>
 * </PluginTemplateWrapper>
 * ```
 */
export const SecurityRoutePageWrapper: React.FC<SecurityRoutePageWrapperProps> = ({
  children,
  pageName,
  redirectOnMissing,
}) => {
  const link = useLinkInfo(pageName);
  const UpsellPage = useUpsellingPage(pageName);

  const isAuthorized = link != null && !link.unauthorized;
  if (isAuthorized) {
    return <TrackApplicationView viewId={pageName}>{children}</TrackApplicationView>;
  }

  if (redirectOnMissing && link == null) {
    return <Redirect to="" />; // redirects to the home page
  }

  if (UpsellPage) {
    return (
      <>
        <SpyRoute pageName={pageName} />
        <UpsellPage />
      </>
    );
  }

  return (
    <>
      <SpyRoute pageName={pageName} />
      <NoPrivilegesPage
        pageName={pageName}
        docLinkSelector={(docLinks) => docLinks.siem.privileges}
      />
    </>
  );
};
