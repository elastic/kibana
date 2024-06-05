/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TraceSearchQuery, TraceSearchType } from '../../../../../common/trace_explorer';
import { useAdHocApmDataView } from '../../../../hooks/use_adhoc_apm_data_view';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

import { EQLCodeEditor } from '../../../shared/monaco_code_editor';

interface Props {
  query: TraceSearchQuery;
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

export function TraceSearchBox({ query, onQueryChange, onQueryCommit, loading }: Props) {
  const {
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = useApmPluginContext();

  const { dataView } = useAdHocApmDataView();

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow>
                {query.type === TraceSearchType.eql ? (
                  <EQLCodeEditor
                    value={query.query}
                    onChange={(value: string) => {
                      onQueryChange({
                        ...query,
                        query: value,
                      });
                    }}
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
                      appName={i18n.translate('xpack.apm.traceExplorer.appName', {
                        defaultMessage: 'APM',
                      })}
                    />
                  </form>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  data-test-subj="apmTraceSearchBoxSelect"
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
          <EuiFlexItem style={{ alignSelf: 'flex-end' }}>
            <EuiButton
              size="s"
              data-test-subj="apmTraceSearchBoxSearchButton"
              isLoading={loading}
              onClick={() => {
                onQueryCommit();
              }}
              iconType="search"
              style={{ width: '100px' }}
            >
              {i18n.translate('xpack.apm.traceSearchBox.refreshButton', {
                defaultMessage: 'Search',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
