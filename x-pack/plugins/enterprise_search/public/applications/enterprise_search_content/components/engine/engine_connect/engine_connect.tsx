/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import {
  SEARCH_APPLICATION_CONTENT_PATH,
  EngineViewTabs,
  SearchApplicationConnectTabs,
} from '../../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../../layout/engines_page_template';

import { EngineError } from '../engine_error';
import { EngineViewLogic } from '../engine_view_logic';

import { SearchApplicationAPI } from './search_application_api';

const pageTitle = i18n.translate(
  'xpack.enterpriseSearch.content.searchApplications.connect.pageTitle',
  {
    defaultMessage: 'Connect',
  }
);
const API_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.content.searchApplications.connect.apiTabTitle',
  {
    defaultMessage: 'API',
  }
);
const ConnectTabs: string[] = Object.values(SearchApplicationConnectTabs);
const getTabBreadCrumb = (tabId: string) => {
  switch (tabId) {
    case SearchApplicationConnectTabs.API:
      return API_TAB_TITLE;
    default:
      return tabId;
  }
};

export const EngineConnect: React.FC = () => {
  const { engineName, isLoadingEngine } = useValues(EngineViewLogic);
  const { connectTabId = SearchApplicationConnectTabs.API } = useParams<{
    connectTabId?: string;
  }>();
  const onTabClick = (tab: SearchApplicationConnectTabs) => () => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(SEARCH_APPLICATION_CONTENT_PATH, {
        engineName,
        connectTabId: tab,
      })
    );
  };
  if (!ConnectTabs.includes(connectTabId)) {
    return (
      <EnterpriseSearchEnginesPageTemplate
        pageChrome={[engineName, pageTitle]}
        pageViewTelemetry={EngineViewTabs.CONNECT}
        isLoading={isLoadingEngine}
        pageHeader={{
          pageTitle,
          rightSideItems: [],
        }}
        engineName={engineName}
      >
        <EngineError notFound />
      </EnterpriseSearchEnginesPageTemplate>
    );
  }

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName, pageTitle, getTabBreadCrumb(connectTabId)]}
      pageViewTelemetry={EngineViewTabs.CONNECT}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle,
        rightSideItems: [],
        tabs: [
          {
            isSelected: connectTabId === SearchApplicationConnectTabs.API,
            label: API_TAB_TITLE,
            onClick: onTabClick(SearchApplicationConnectTabs.API),
          },
        ],
      }}
      engineName={engineName}
    >
      {connectTabId === SearchApplicationConnectTabs.API && <SearchApplicationAPI />}
    </EnterpriseSearchEnginesPageTemplate>
  );
};
