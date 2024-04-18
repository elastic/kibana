/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect } from 'react';

import { useValues } from 'kea';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { SetEnterpriseSearchApplicationsChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { useEnterpriseSearchApplicationNav } from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';
import { PlaygroundHeaderDocsAction } from '../playground/header_docs_action';
import { SearchApplicationHeaderDocsAction } from '../search_application/header_docs_action';

export type EnterpriseSearchApplicationsPageTemplateProps = Omit<
  PageTemplateProps,
  'useEndpointHeaderActions'
> & {
  docLink?: 'search_application' | 'playground';
  hasSchemaConflicts?: boolean;
  restrictWidth?: boolean;
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
  restrictWidth = true,
  docLink = 'search_application',
  ...pageTemplateProps
}) => {
  const navItems = useEnterpriseSearchApplicationNav(
    searchApplicationName,
    pageTemplateProps.isEmptyState,
    hasSchemaConflicts
  );
  const { renderHeaderActions } = useValues(KibanaLogic);
  useLayoutEffect(() => {
    const docAction = {
      playground: PlaygroundHeaderDocsAction,
      search_application: SearchApplicationHeaderDocsAction,
    }[docLink];
    renderHeaderActions(docAction);

    return () => {
      renderHeaderActions();
    };
  }, []);
  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: navItems,
        name: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME,
      }}
      restrictWidth={restrictWidth}
      setPageChrome={pageChrome && <SetEnterpriseSearchApplicationsChrome trail={pageChrome} />}
      useEndpointHeaderActions={false}
    >
      {pageViewTelemetry && (
        <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
