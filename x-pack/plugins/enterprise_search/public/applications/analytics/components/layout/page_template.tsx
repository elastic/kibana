/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { generateEncodedPath } from '../../../shared/encode_path_params';

import { SetAnalyticsChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { useEnterpriseSearchAnalyticsNav } from '../../../shared/layout/nav';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';
import {
  COLLECTION_EXPLORER_PATH,
  COLLECTION_INTEGRATE_PATH,
  COLLECTION_OVERVIEW_PATH,
} from '../../routes';

interface EnterpriseSearchAnalyticsPageTemplateProps extends PageTemplateProps {
  analyticsName?: string;
}

export const EnterpriseSearchAnalyticsPageTemplate: React.FC<
  EnterpriseSearchAnalyticsPageTemplateProps
> = ({ children, analyticsName, pageChrome, pageViewTelemetry, ...pageTemplateProps }) => {
  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: useEnterpriseSearchAnalyticsNav(
          analyticsName,
          analyticsName
            ? {
                explorer: generateEncodedPath(COLLECTION_EXPLORER_PATH, {
                  name: analyticsName,
                }),
                integration: generateEncodedPath(COLLECTION_INTEGRATE_PATH, {
                  name: analyticsName,
                }),
                overview: generateEncodedPath(COLLECTION_OVERVIEW_PATH, {
                  name: analyticsName,
                }),
              }
            : undefined
        ),
        name: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME,
      }}
      setPageChrome={pageChrome && <SetAnalyticsChrome trail={pageChrome} />}
    >
      {pageViewTelemetry && (
        <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
