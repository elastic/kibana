/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiNotificationBadge,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';

import { docLinks } from '../../../shared/doc_links';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_TAB_PATH, EngineViewTabs } from '../../routes';

import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineError } from './engine_error';
import { EngineViewLogic } from './engine_view_logic';

export const EngineView: React.FC = () => {
  const { engineData, engineName, fetchEngineApiStatus, isLoadingEngine } =
    useValues(EngineViewLogic);
  const { fetchEngine } = useActions(EngineViewLogic);
  const { tabId = EngineViewTabs.OVERVIEW } = useParams<{
    tabId?: string;
  }>();
  useEffect(() => {
    fetchEngine({ engineName });
  }, [engineName]);

  if (fetchEngineApiStatus.status === Status.ERROR) {
    return (
      <EnterpriseSearchEnginesPageTemplate
        isEmptyState
        pageChrome={[engineName]}
        pageViewTelemetry={tabId}
        pageHeader={{
          pageTitle: engineName,
          rightSideItems: [],
        }}
        engineName={engineName}
        emptyState={<EngineError apiStatus={fetchEngineApiStatus} />}
      />
    );
  }

  const tabs: EuiTabbedContentTab[] = [
    {
      content: <div />,
      id: EngineViewTabs.OVERVIEW,
      isSelected: tabId === EngineViewTabs.OVERVIEW || undefined,
      name: i18n.translate('xpack.enterpriseSearch.engines.engineView.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      append: engineData && (
        <EuiNotificationBadge color="subdued">{engineData.indices.length}</EuiNotificationBadge>
      ),
      content: <div />,
      id: EngineViewTabs.INDICES,
      isSelected: tabId === EngineViewTabs.INDICES || undefined,
      name: i18n.translate('xpack.enterpriseSearch.engines.engineView.indicesTabLabel', {
        defaultMessage: 'Indices',
      }),
    },
    {
      content: <div />,
      id: EngineViewTabs.DOCUMENTS,
      isSelected: tabId === EngineViewTabs.DOCUMENTS || undefined,
      name: i18n.translate('xpack.enterpriseSearch.engines.engineView.documentsTabLabel', {
        defaultMessage: 'Documents',
      }),
    },
    {
      content: <div />,
      id: EngineViewTabs.SCHEMA,
      isSelected: tabId === EngineViewTabs.SCHEMA || undefined,
      name: i18n.translate('xpack.enterpriseSearch.engines.engineView.schemaTabLabel', {
        defaultMessage: 'Schema',
      }),
    },
    {
      content: <div />,
      id: EngineViewTabs.PREVIEW,
      isSelected: tabId === EngineViewTabs.PREVIEW || undefined,
      name: i18n.translate('xpack.enterpriseSearch.engines.engineView.previewTabLabel', {
        defaultMessage: 'Preview',
      }),
    },
    {
      content: <div />,
      id: EngineViewTabs.API,
      isSelected: tabId === EngineViewTabs.API || undefined,
      name: i18n.translate('xpack.enterpriseSearch.engines.engineView.apiTabLabel', {
        defaultMessage: 'API',
      }),
    },
  ];
  const onTabClick = (tab: EuiTabbedContentTab) => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(ENGINE_TAB_PATH, {
        engineName,
        tabId: tab.id,
      })
    );
  };

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={tabId}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle: engineName,
        rightSideItems: [
          <EuiButtonEmpty
            href={docLinks.appSearchElasticsearchIndexedEngines} // TODO: replace with real docLinks when it's created
            target="_blank"
            iconType="documents"
          >
            Engine Docs
          </EuiButtonEmpty>,
        ],
      }}
      engineName={engineName}
    >
      <>
        <EuiTabbedContent tabs={tabs} onTabClick={onTabClick} />
      </>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
