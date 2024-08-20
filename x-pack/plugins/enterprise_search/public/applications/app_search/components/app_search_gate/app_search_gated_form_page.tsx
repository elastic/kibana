/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';

import {
  EnterpriseSearchPageTemplateWrapper,
  PageTemplateProps,
  useEnterpriseSearchNav,
} from '../../../shared/layout';
import { SendAppSearchTelemetry } from '../../../shared/telemetry';

import { AppSearchGate } from './app_search_gate';

export const AppSearchGatePage: React.FC<PageTemplateProps> = ({ isLoading }) => {
  return (
    <EnterpriseSearchPageTemplateWrapper
      restrictWidth
      pageHeader={{
        description: (
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.gateForm.description"
            defaultMessage="The standalone App Search product remains available in maintenance mode, but is not recommended for new search experiences. We recommend using native Elasticsearch tools, which offer flexibility and composability, and include exciting new search features. To help you choose the tools best suited for your use case, we’ve created this recommendation wizard. Select the features you need, and we'll point you to corresponding Elasticsearch features. If you still want to use the standalone App Search product, you can do so after submitting the form."
          />
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.title', {
          defaultMessage: 'Before you begin...',
        }),
      }}
      solutionNav={{
        items: useEnterpriseSearchNav(),
        name: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME,
      }}
      isLoading={isLoading}
      hideEmbeddedConsole
    >
      <SendAppSearchTelemetry action="viewed" metric="App Search Gate form" />

      <AppSearchGate />
    </EnterpriseSearchPageTemplateWrapper>
  );
};
