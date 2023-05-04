/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { SetEnterpriseSearchEnginesChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { useEnterpriseSearchEngineNav } from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

export type EnterpriseSearchEnginesPageTemplateProps = PageTemplateProps & {
  engineName?: string;
};

export const EnterpriseSearchEnginesPageTemplate: React.FC<
  EnterpriseSearchEnginesPageTemplateProps
> = ({ children, pageChrome, pageViewTelemetry, engineName, ...pageTemplateProps }) => {
  const navItems = useEnterpriseSearchEngineNav(engineName, pageTemplateProps.isEmptyState);
  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: navItems,
        name: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME,
      }}
      restrictWidth
      setPageChrome={pageChrome && <SetEnterpriseSearchEnginesChrome trail={pageChrome} />}
    >
      {pageViewTelemetry && (
        <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
