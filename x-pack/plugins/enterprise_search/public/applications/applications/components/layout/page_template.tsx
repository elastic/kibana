/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect } from 'react';

import { useValues } from 'kea';

import useObservable from 'react-use/lib/useObservable';

import type { EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';

import { SEARCH_PRODUCT_NAME } from '../../../../../common/constants';
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
  const alwaysReturnNavItems = true;
  const navItems = useEnterpriseSearchApplicationNav(
    searchApplicationName,
    pageTemplateProps.isEmptyState,
    hasSchemaConflicts,
    alwaysReturnNavItems
  );

  const { renderHeaderActions, updateSideNavDefinition, getChromeStyle$ } = useValues(KibanaLogic);
  const chromeStyle = useObservable(getChromeStyle$(), 'classic');

  const getSelectedAppItems = useCallback(
    (
      items?: Array<EuiSideNavItemTypeEnhanced<unknown>>
    ): Array<EuiSideNavItemTypeEnhanced<unknown>> | undefined => {
      if (!items) return undefined;

      const buildGroup = items.find((item) => item.id === 'build');
      if (!buildGroup || !buildGroup.items) return undefined;

      const searchAppsGroup = buildGroup.items.find((item) => item.id === 'searchApplications');

      return searchAppsGroup?.items;
    },
    []
  );

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

  useEffect(() => {
    // We update the new side nav definition with the selected app items
    updateSideNavDefinition({ searchApps: getSelectedAppItems(navItems) });
  }, [navItems, getSelectedAppItems, updateSideNavDefinition]);

  useEffect(() => {
    return () => {
      updateSideNavDefinition({ searchApps: undefined });
    };
  }, [updateSideNavDefinition]);

  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: chromeStyle === 'classic' ? navItems : undefined,
        name: SEARCH_PRODUCT_NAME,
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
