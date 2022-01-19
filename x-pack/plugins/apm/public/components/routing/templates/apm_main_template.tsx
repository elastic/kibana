/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  useKibana,
  KibanaPageTemplateProps,
} from '../../../../../../../src/plugins/kibana_react/public';
import { EnvironmentsContextProvider } from '../../../context/environments_context/environments_context';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ApmPluginStartDeps } from '../../../plugin';
import { CreateGroups } from '../../app/service_inventory/service_groups/create_groups';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';
import { getNoDataConfig } from './no_data_config';

// Paths that must skip the no data screen
const bypassNoDataScreenPaths = ['/settings'];

/*
 * This template contains:
 *  - The Shared Observability Nav (https://github.com/elastic/kibana/blob/f7698bd8aa8787d683c728300ba4ca52b202369c/x-pack/plugins/observability/public/components/shared/page_template/README.md)
 *  - The APM Header Action Menu
 *  - Page title
 *
 *  Optionally:
 *   - EnvironmentFilter
 */
export function ApmMainTemplate({
  pageTitle,
  pageHeader,
  children,
  environmentFilter = true,
  showCreateServiceGroupsButton,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
  environmentFilter?: boolean;
  showCreateServiceGroupsButton?: boolean;
} & KibanaPageTemplateProps) {
  const location = useLocation();

  const { services } = useKibana<ApmPluginStartDeps>();
  const { http, docLinks, observability } = services;
  const basePath = http?.basePath.get();

  const ObservabilityPageTemplate = observability.navigation.PageTemplate;

  const { data } = useFetcher((callApmApi) => {
    return callApmApi({ endpoint: 'GET /internal/apm/has_data' });
  }, []);

  const noDataConfig = getNoDataConfig({
    basePath,
    docsLink: docLinks!.links.observability.guide,
    hasData: data?.hasData,
  });

  const shouldBypassNoDataScreen = bypassNoDataScreenPaths.some((path) =>
    location.pathname.includes(path)
  );

  const rightSideItems = [
    showCreateServiceGroupsButton ? <CreateGroups /> : undefined,
    environmentFilter ? <ApmEnvironmentFilter /> : undefined,
  ];

  const pageTemplate = (
    <ObservabilityPageTemplate
      noDataConfig={shouldBypassNoDataScreen ? undefined : noDataConfig}
      pageHeader={{
        pageTitle,
        rightSideItems,
        ...pageHeader,
      }}
      {...pageTemplateProps}
    >
      {children}
    </ObservabilityPageTemplate>
  );

  if (environmentFilter) {
    return (
      <EnvironmentsContextProvider>{pageTemplate}</EnvironmentsContextProvider>
    );
  }

  return pageTemplate;
}
