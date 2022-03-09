/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { SetAppSearchChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { SendAppSearchTelemetry } from '../../../shared/telemetry';

import { useAppSearchNav } from './nav';

export const AppSearchPageTemplate: React.FC<PageTemplateProps> = ({
  children,
  pageChrome,
  pageViewTelemetry,
  ...pageTemplateProps
}) => {
  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        name: APP_SEARCH_PLUGIN.NAME,
        items: useAppSearchNav(),
      }}
      setPageChrome={pageChrome && <SetAppSearchChrome trail={pageChrome} />}
    >
      {pageViewTelemetry && <SendAppSearchTelemetry action="viewed" metric={pageViewTelemetry} />}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
