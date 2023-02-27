/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import {
  PagingInfo,
  Results,
  ResultsPerPage,
  SearchBox,
  SearchProvider,
} from '@elastic/react-search-ui';
import { SearchDriverOptions } from '@elastic/search-ui';
import EnginesAPIConnector, {
  Transporter,
  SearchRequest,
  SearchResponse,
} from '@elastic/search-ui-engines-connector';
import { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../../shared/http';
import { EngineViewTabs } from '../../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../../layout/engines_page_template';

import { EngineIndicesLogic } from '../engine_indices_logic';
import { EngineViewLogic } from '../engine_view_logic';

import { APICallFlyout, APICallData } from './api_call_flyout';
import { DocumentProvider } from './document_context';
import { DocumentFlyout } from './document_flyout';
import { EngineSearchPreviewLogic } from './engine_search_preview_logic';

import {
  InputView,
  PagingInfoView,
  RESULTS_PER_PAGE_OPTIONS,
  ResultView,
  ResultsPerPageView,
  ResultsView,
} from './search_ui_components';

class InternalEngineTransporter implements Transporter {
  constructor(
    private http: HttpSetup,
    private engineName: string,
    private setLastAPICall: (apiCallData: APICallData) => void
  ) {}

  async performRequest(request: SearchRequest) {
    const url = `/internal/enterprise_search/engines/${this.engineName}/search`;

    const response = await this.http.post<SearchResponse>(url, {
      body: JSON.stringify(request),
    });

    this.setLastAPICall({ request, response });

    const withUniqueIds = {
      ...response,
      hits: {
        ...response.hits,
        hits: response.hits.hits.map((hit) => ({
          ...hit,
          _id: btoa(JSON.stringify([hit._index, hit._id])),
        })),
      },
    };

    return withUniqueIds;
  }
}

export const EngineSearchPreview: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const [showAPICallFlyout, setShowAPICallFlyout] = useState<boolean>(false);
  const [lastAPICall, setLastAPICall] = useState<null | APICallData>(null);
  const { engineName, isLoadingEngine } = useValues(EngineViewLogic);
  const { resultFields, searchableFields } = useValues(EngineSearchPreviewLogic);
  const { engineData } = useValues(EngineIndicesLogic);

  const config: SearchDriverOptions = useMemo(() => {
    const transporter = new InternalEngineTransporter(http, engineName, setLastAPICall);
    const connector = new EnginesAPIConnector(transporter);

    return {
      alwaysSearchOnInitialLoad: true,
      apiConnector: connector,
      hasA11yNotifications: true,
      searchQuery: {
        result_fields: resultFields,
        search_fields: searchableFields,
      },
    };
  }, [http, engineName, setLastAPICall]);

  if (!engineData) return null;

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={EngineViewTabs.PREVIEW}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engine.searchPreview.pageTitle', {
          defaultMessage: 'Search Preview',
        }),
        rightSideItems: [
          <>
            <EuiButton
              color="primary"
              iconType="eye"
              onClick={() => setShowAPICallFlyout(true)}
              isLoading={lastAPICall == null}
            >
              View this API call
            </EuiButton>
          </>,
        ],
      }}
      engineName={engineName}
    >
      <DocumentProvider>
        <SearchProvider config={config}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <SearchBox inputView={InputView} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false} css={{ minWidth: '240px' }}>
              <ResultsPerPage view={ResultsPerPageView} options={RESULTS_PER_PAGE_OPTIONS} />
            </EuiFlexItem>
            <EuiFlexItem>
              <PagingInfo view={PagingInfoView} />
              <EuiSpacer size="m" />
              <Results view={ResultsView} resultView={ResultView} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SearchProvider>
        <DocumentFlyout />
        {showAPICallFlyout && lastAPICall && (
          <APICallFlyout
            onClose={() => setShowAPICallFlyout(false)}
            lastAPICall={lastAPICall}
            engineName={engineName}
          />
        )}
      </DocumentProvider>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
