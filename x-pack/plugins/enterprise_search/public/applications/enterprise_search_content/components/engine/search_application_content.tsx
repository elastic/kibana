/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';

import {
  ENGINE_PATH,
  SEARCH_APPLICATION_CONTENT_PATH,
  EngineViewTabs,
  SearchApplicationContentTabs,
} from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { AddIndicesFlyout } from './add_indices_flyout';
import { EngineError } from './engine_error';
import { EngineIndices } from './engine_indices';
import { EngineIndicesLogic } from './engine_indices_logic';
import { EngineSchema } from './engine_schema';
import { EngineViewLogic } from './engine_view_logic';

const pageTitle = i18n.translate(
  'xpack.enterpriseSearch.content.searchApplications.content.pageTitle',
  {
    defaultMessage: 'Content',
  }
);
const INDICES_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.content.searchApplications.content.indicesTabTitle',
  {
    defaultMessage: 'Indices',
  }
);
const SCHEMA_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.content.searchApplications.content.schemaTabTitle',
  {
    defaultMessage: 'Schema',
  }
);

const getTabBreadCrumb = (tabId: string) => {
  switch (tabId) {
    case SearchApplicationContentTabs.INDICES:
      return INDICES_TAB_TITLE;
    case SearchApplicationContentTabs.SCHEMA:
      return SCHEMA_TAB_TITLE;
    default:
      return tabId;
  }
};

const ContentTabs: string[] = Object.values(SearchApplicationContentTabs);

export const SearchApplicationContent = () => {
  const { engineName, isLoadingEngine } = useValues(EngineViewLogic);
  const { addIndicesFlyoutOpen } = useValues(EngineIndicesLogic);
  const { closeAddIndicesFlyout, openAddIndicesFlyout } = useActions(EngineIndicesLogic);
  const { contentTabId = SearchApplicationContentTabs.INDICES } = useParams<{
    contentTabId?: string;
  }>();

  if (!ContentTabs.includes(contentTabId)) {
    return (
      <EnterpriseSearchEnginesPageTemplate
        pageChrome={[engineName, pageTitle]}
        pageViewTelemetry={EngineViewTabs.CONTENT}
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

  const onTabClick = (tab: SearchApplicationContentTabs) => () => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(SEARCH_APPLICATION_CONTENT_PATH, {
        contentTabId: tab,
        engineName,
      })
    );
  };

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName, pageTitle, getTabBreadCrumb(contentTabId)]}
      pageViewTelemetry={EngineViewTabs.CONTENT}
      isLoading={isLoadingEngine}
      pageHeader={{
        breadcrumbs: [
          {
            color: 'primary',
            onClick: () =>
              KibanaLogic.values.navigateToUrl(
                generateEncodedPath(ENGINE_PATH, {
                  engineName,
                })
              ),
            text: (
              <>
                <EuiIcon size="s" type="arrowLeft" /> {engineName}
              </>
            ),
          },
        ],
        pageTitle,
        rightSideItems: [
          <EuiButton
            data-telemetry-id="entSearchContent-engines-indices-addNewIndices"
            data-test-subj="engine-add-new-indices-btn"
            iconType="plusInCircle"
            fill
            onClick={openAddIndicesFlyout}
          >
            {i18n.translate('xpack.enterpriseSearch.content.engine.indices.addNewIndicesButton', {
              defaultMessage: 'Add new indices',
            })}
          </EuiButton>,
        ],
        tabs: [
          {
            isSelected: contentTabId === SearchApplicationContentTabs.INDICES,
            label: INDICES_TAB_TITLE,
            onClick: onTabClick(SearchApplicationContentTabs.INDICES),
          },
          {
            isSelected: contentTabId === SearchApplicationContentTabs.SCHEMA,
            label: SCHEMA_TAB_TITLE,
            onClick: onTabClick(SearchApplicationContentTabs.SCHEMA),
          },
        ],
      }}
      engineName={engineName}
    >
      {contentTabId === SearchApplicationContentTabs.INDICES && <EngineIndices />}
      {contentTabId === SearchApplicationContentTabs.SCHEMA && <EngineSchema />}
      {addIndicesFlyoutOpen && <AddIndicesFlyout onClose={closeAddIndicesFlyout} />}
    </EnterpriseSearchEnginesPageTemplate>
  );
};
