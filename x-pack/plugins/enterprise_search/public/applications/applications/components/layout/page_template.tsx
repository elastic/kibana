/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { SetEnterpriseSearchApplicationsChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { useEnterpriseSearchApplicationNav } from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

export type EnterpriseSearchApplicationsPageTemplateProps = PageTemplateProps & {
  hasSchemaConflicts?: boolean;
  searchApplicationName?: string;
};

export const EnterpriseSearchApplicationsPageTemplate: React.FC<
  EnterpriseSearchApplicationsPageTemplateProps
> = ({
  children,
  pageChrome,
  pageViewTelemetry,
  searchApplicationName,
  hasSchemaConflicts,
  ...pageTemplateProps
}) => {
  const navItems = useEnterpriseSearchApplicationNav(
    searchApplicationName,
    pageTemplateProps.isEmptyState,
    hasSchemaConflicts
  );
  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: navItems,
        name: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME,
      }}
      restrictWidth
      setPageChrome={pageChrome && <SetEnterpriseSearchApplicationsChrome trail={pageChrome} />}
    >
      {pageViewTelemetry && (
        <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
