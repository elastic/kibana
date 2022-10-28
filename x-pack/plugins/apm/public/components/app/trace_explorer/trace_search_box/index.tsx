/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../../plugin';
import {
  TraceSearchQuery,
  TraceSearchType,
} from '../../../../../common/trace_explorer';
import { useApmDataView } from '../../../../hooks/use_apm_data_view';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { EQLCodeEditorSuggestionType } from '../../../shared/eql_code_editor/constants';
import { LazilyLoadedEQLCodeEditor } from '../../../shared/eql_code_editor/lazily_loaded_code_editor';

interface Props {
  query: TraceSearchQuery;
  message?: string;
  error: boolean;
  onQueryChange: (query: TraceSearchQuery) => void;
  onQueryCommit: () => void;
  loading: boolean;
}

const options: EuiSelectOption[] = [
  {
    value: TraceSearchType.kql,
    text: i18n.translate('xpack.apm.traceSearchBox.traceSearchTypeKql', {
      defaultMessage: 'KQL',
    }),
  },
  {
    value: TraceSearchType.eql,
    text: i18n.translate('xpack.apm.traceSearchBox.traceSearchTypeEql', {
      defaultMessage: 'EQL',
    }),
  },
];

export function TraceSearchBox({
  query,
  onQueryChange,
  onQueryCommit,
  message,
  error,
  loading,
}: Props) {
  const { unifiedSearch, core, data, dataViews } = useApmPluginContext();
  const { notifications, http, docLinks, uiSettings } = core;
  const {
    services: { storage },
  } = useKibana<ApmPluginStartDeps>();

  const { dataView } = useApmDataView();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow>
                {query.type === TraceSearchType.eql ? (
                  <LazilyLoadedEQLCodeEditor
                    value={query.query}
                    onChange={(value) => {
                      onQueryChange({
                        ...query,
                        query: value,
                      });
                    }}
                    onBlur={() => {
                      onQueryCommit();
                    }}
                    getSuggestions={async (request) => {
                      switch (request.type) {
                        case EQLCodeEditorSuggestionType.EventType:
                          return ['transaction', 'span', 'error'];

                        case EQLCodeEditorSuggestionType.Field:
                          return (
                            dataView?.fields.map((field) => field.name) ?? []
                          );

                        case EQLCodeEditorSuggestionType.Value:
                          const field = dataView?.getFieldByName(request.field);

                          if (!dataView || !field) {
                            return [];
                          }

                          const suggestions: string[] =
                            await unifiedSearch.autocomplete.getValueSuggestions(
                              {
                                field,
                                indexPattern: dataView,
                                query: request.value,
                                useTimeRange: true,
                                method: 'terms_agg',
                              }
                            );

                          return suggestions.slice(0, 15);
                      }
                    }}
                    width="100%"
                    height="100px"
                  />
                ) : (
                  <form>
                    <QueryStringInput
                      disableLanguageSwitcher
                      indexPatterns={dataView ? [dataView] : []}
                      query={{
                        query: query.query,
                        language: 'kuery',
                      }}
                      onSubmit={() => {
                        onQueryCommit();
                      }}
                      disableAutoFocus
                      submitOnBlur
                      isClearable
                      onChange={(e) => {
                        onQueryChange({
                          ...query,
                          query: String(e.query ?? ''),
                        });
                      }}
                      appName={i18n.translate(
                        'xpack.apm.traceExplorer.appName',
                        {
                          defaultMessage: 'APM',
                        }
                      )}
                      deps={{
                        unifiedSearch,
                        notifications,
                        http,
                        docLinks,
                        uiSettings,
                        data,
                        dataViews,
                        storage,
                      }}
                    />
                  </form>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  id="select-query-language"
                  value={query.type}
                  onChange={(e) => {
                    onQueryChange({
                      query: '',
                      type: e.target.value as TraceSearchType,
                    });
                  }}
                  options={options}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              alignItems="center"
              justifyContent="flexEnd"
            >
              <EuiFlexItem>
                <EuiText color={error ? 'danger' : 'subdued'} size="xs">
                  {message}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={loading}
                  onClick={() => {
                    onQueryCommit();
                  }}
                  iconType="search"
                >
                  {i18n.translate('xpack.apm.traceSearchBox.refreshButton', {
                    defaultMessage: 'Search',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
