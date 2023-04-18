/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EngineViewTabs, SearchApplicationConnectTabs } from '../../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../../layout/engines_page_template';

import { EngineViewLogic } from '../engine_view_logic';

import { SearchApplicationAPI } from './search_application_api';

const pageTitle = i18n.translate(
  'xpack.enterpriseSearch.content.searchApplications.connect.pageTitle',
  {
    defaultMessage: 'Connect',
  }
);

export const EngineConnect: React.FC = () => {
  const { engineName, isLoadingEngine } = useValues(EngineViewLogic);
  const [connectTabId, setTab] = React.useState<SearchApplicationConnectTabs>(
    SearchApplicationConnectTabs.API
  );

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName, pageTitle]}
      pageViewTelemetry={EngineViewTabs.CONNECT}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle,
        rightSideItems: [],
        tabs: [
          {
            onClick: () => setTab(SearchApplicationConnectTabs.API),
            isSelected: connectTabId === SearchApplicationConnectTabs.API,
            label: i18n.translate(
              'xpack.enterpriseSearch.content.searchApplications.connect.apiTabTitle',
              {
                defaultMessage: 'API',
              }
            ),
          },
        ],
      }}
      engineName={engineName}
    >
      {connectTabId === SearchApplicationConnectTabs.API && <SearchApplicationAPI />}
    </EnterpriseSearchEnginesPageTemplate>
  );
};
