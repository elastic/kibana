/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { SearchProvider, SearchBox, Results, Sorting } from '@elastic/react-search-ui';
import {
  ResultsViewProps,
  ResultViewProps,
  InputViewProps,
  SortingViewProps,
} from '@elastic/react-search-ui-views';
import { SearchDriverOptions, SearchResult } from '@elastic/search-ui';
import EnginesAPIConnector, {
  Transporter,
  SearchReqest,
  SearchResponse,
} from '@elastic/search-ui-engines-connector';
import { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../../shared/http';
import { EngineViewTabs } from '../../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../../layout/engines_page_template';

import { EngineIndicesLogic } from '../engine_indices_logic';
import { EngineViewLogic } from '../engine_view_logic';

import { EngineSearchPreviewLogic } from './engine_search_preview_logic';

class InternalEngineTransporter implements Transporter {
  constructor(private http: HttpSetup, private engineName: string) {}

  async performRequest(request: SearchReqest) {
    const url = `/internal/enterprise_search/engines/${this.engineName}/search`;

    const response = await this.http.post<SearchResponse>(url, {
      body: JSON.stringify(request),
    });
    return response;
  }
}

const ResultsView: React.FC<ResultsViewProps> = ({ children }) => {
  return <EuiFlexGroup direction="column">{children}</EuiFlexGroup>;
};

const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const fields = Object.entries(result)
    .filter(([key]) => !key.startsWith('_') && key !== 'id')
    .map(([key, value]) => {
      return {
        name: key,
        value: value.raw,
      };
    });

  const {
    _meta: {
      id,
      rawHit: { _index: index },
    },
  } = result;

  const columns: Array<EuiBasicTableColumn<SearchResult>> = [
    {
      field: 'name',
      name: 'name',
      render: (name: string) => {
        return <code>&quot;{name}&quot;</code>;
      },
      truncateText: true,
      width: '20%',
    },
    {
      field: 'value',
      name: 'value',
      render: (value: string) => value,
    },
  ];

  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup direction="column">
        <EuiFlexGroup justifyContent="spaceBetween">
          <code>ID: {id}</code>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <code>from</code>
              <EuiBadge color="hollow">{index}</EuiBadge>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiBasicTable items={fields} rowHeader="firstName" columns={columns} />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const InputView: React.FC<InputViewProps> = ({ getInputProps }) => {
  return (
    <EuiFieldSearch
      fullWidth
      placeholder="search"
      {...getInputProps({})}
      isClearable
      aria-label="Search Input"
    />
  );
};

const SortingView: React.FC<SortingViewProps> = ({ options = [], value, onChange }) => {
  return (
    <EuiSelect
      options={options.map((option) => ({
        text: option.label,
        value: option.value,
      }))}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      aria-label="Use aria labels when no actual label is in use"
    />
  );
};

export const EngineSearchPreview: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const { engineName, isLoadingEngine } = useValues(EngineViewLogic);
  const { resultFields, searchableFields } = useValues(EngineSearchPreviewLogic);
  const { engineData } = useValues(EngineIndicesLogic);

  if (!engineData) return null;

  const transporter = new InternalEngineTransporter(http, engineName);

  const connector = new EnginesAPIConnector(transporter);

  const config: SearchDriverOptions = {
    alwaysSearchOnInitialLoad: true,
    apiConnector: connector,
    hasA11yNotifications: true,
    searchQuery: {
      result_fields: resultFields,
      search_fields: searchableFields,
    },
  };

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={EngineViewTabs.PREVIEW}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engine.searchPreview.pageTitle', {
          defaultMessage: 'Search Preview',
        }),
        rightSideItems: [],
      }}
      engineName={engineName}
    >
      <SearchProvider config={config}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <SearchBox inputView={InputView} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false} css={{ minWidth: '240px' }}>
            <EuiForm component="div">
              <EuiFormRow label="Sorting">
                <Sorting
                  view={SortingView}
                  sortOptions={[
                    {
                      name: 'Relevance',
                      value: [],
                    },
                  ]}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem>
            <Results view={ResultsView} resultView={ResultView} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SearchProvider>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
