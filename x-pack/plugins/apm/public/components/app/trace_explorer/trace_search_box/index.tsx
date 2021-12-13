/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { QueryStringInput } from '../../../../../../../../src/plugins/data/public';
import {
  TraceSearchQuery,
  TraceSearchType,
} from '../../../../../common/trace_explorer';
import { useDynamicDataViewFetcher } from '../../../../hooks/use_dynamic_data_view';
import { LazilyLoadedEQLCodeEditor } from '../../../shared/eql_code_editor/lazily_loaded_code_editor';

interface Props {
  query: TraceSearchQuery;
  message?: string;
  error: boolean;
  disabled: boolean;
  onCancelClick: () => void;
  onQueryChange: (query: TraceSearchQuery) => void;
  onQueryCommit: () => void;
  title: React.ReactElement;
  loading: boolean;
}

export function TraceSearchBox({
  query,
  onQueryChange,
  onQueryCommit,
  onCancelClick,
  title,
  message,
  error,
  disabled,
  loading,
}: Props) {
  const { dataView } = useDynamicDataViewFetcher();

  const indexPatterns = dataView ? [dataView] : [];

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTabs size="s">
              <EuiTab
                disabled={disabled}
                isSelected={query.type === TraceSearchType.kql}
                onClick={() => {
                  onQueryChange({
                    query: '',
                    type: TraceSearchType.kql,
                  });
                  onQueryCommit();
                }}
              >
                {i18n.translate('xpack.apm.traceSearchBox.kql', {
                  defaultMessage: 'KQL',
                })}
              </EuiTab>
              <EuiTab
                disabled={disabled}
                isSelected={query.type === TraceSearchType.eql}
                onClick={() => {
                  onQueryChange({
                    query: '',
                    type: TraceSearchType.eql,
                  });
                  onQueryCommit();
                }}
              >
                {i18n.translate('xpack.apm.traceSearchBox.eql', {
                  defaultMessage: 'EQL',
                })}
              </EuiTab>
            </EuiTabs>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
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
                width="100%"
                height="100px"
              />
            ) : (
              <form>
                <QueryStringInput
                  disableLanguageSwitcher
                  indexPatterns={indexPatterns}
                  query={{
                    query: query.query,
                    language: 'kuery',
                  }}
                  onSubmit={() => {
                    onQueryCommit();
                  }}
                  submitOnBlur
                  onChange={(e) => {
                    onQueryChange({
                      ...query,
                      query: String(e.query ?? ''),
                    });
                  }}
                />
              </form>
            )}
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
                <EuiButtonEmpty
                  isDisabled={!loading}
                  onClick={() => {
                    onCancelClick();
                  }}
                >
                  {i18n.translate('xpack.apm.traceSearchBox.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={loading}
                  isDisabled={loading || disabled}
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
