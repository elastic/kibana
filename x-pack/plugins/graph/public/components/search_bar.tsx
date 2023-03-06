/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiToolTip } from '@elastic/eui';
import React, { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { toElasticsearchQuery, fromKueryExpression, Query } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public/types';
import { IndexPatternSavedObject, IndexPatternProvider, WorkspaceField } from '../types';
import { openSourceModal } from '../services/source_modal';
import {
  GraphState,
  datasourceSelector,
  requestDatasource,
  IndexpatternDatasource,
  submitSearch,
  selectedFieldsSelector,
} from '../state_management';

import { TooltipWrapper } from './tooltip_wrapper';

export interface SearchBarProps {
  isLoading: boolean;
  urlQuery: string | null;
  currentIndexPattern?: DataView;
  onIndexPatternChange: (indexPattern?: DataView) => void;
  confirmWipeWorkspace: (
    onConfirm: () => void,
    text?: string,
    options?: { confirmButtonText: string; title: string }
  ) => void;
  indexPatternProvider: IndexPatternProvider;
}

export interface SearchBarStateProps {
  currentDatasource?: IndexpatternDatasource;
  selectedFields: WorkspaceField[];
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  submit: (searchTerm: string) => void;
}

function queryToString(query: Query, indexPattern: DataView) {
  if (query.language === 'kuery' && typeof query.query === 'string') {
    const dsl = toElasticsearchQuery(fromKueryExpression(query.query as string), indexPattern);
    // JSON representation of query will be handled by existing logic.
    // TODO clean this up and handle it in the data fetch layer once
    // it moved to typescript.
    return JSON.stringify(dsl);
  }

  if (typeof query.query === 'string') {
    return query.query;
  }

  return JSON.stringify(query.query);
}

export function SearchBarComponent(props: SearchBarStateProps & SearchBarProps) {
  const {
    isLoading,
    urlQuery,
    currentIndexPattern,
    currentDatasource,
    indexPatternProvider,
    selectedFields,
    submit,
    onIndexPatternSelected,
    confirmWipeWorkspace,
    onIndexPatternChange,
  } = props;
  const [query, setQuery] = useState<Query>({ language: 'kuery', query: urlQuery || '' });

  useEffect(
    () => setQuery((prev) => ({ language: prev.language, query: urlQuery || '' })),
    [urlQuery]
  );

  useEffect(() => {
    async function fetchPattern() {
      if (currentDatasource) {
        onIndexPatternChange(await indexPatternProvider.get(currentDatasource.id));
      } else {
        onIndexPatternChange(undefined);
      }
    }
    fetchPattern();
  }, [currentDatasource, indexPatternProvider, onIndexPatternChange]);

  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { services, overlays } = kibana;
  const {
    uiSettings,
    appName,
    unifiedSearch,
    data,
    dataViews,
    storage,
    notifications,
    http,
    docLinks,
    savedObjectsManagement,
  } = services;
  if (!overlays) return null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isLoading && currentIndexPattern) {
          submit(queryToString(query, currentIndexPattern));
        }
      }}
    >
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.graph.bar.pickSourceTooltip', {
              defaultMessage: 'Select a data source to begin graphing relationships.',
            })}
          >
            <EuiButton
              className="gphSearchBar__datasourceButton"
              data-test-subj="graphDatasourceButton"
              onClick={() => {
                confirmWipeWorkspace(
                  () =>
                    openSourceModal(
                      { overlays, http, uiSettings, savedObjectsManagement },
                      onIndexPatternSelected
                    ),
                  i18n.translate('xpack.graph.clearWorkspace.confirmText', {
                    defaultMessage:
                      'If you change data sources, your current fields and vertices will be reset.',
                  }),
                  {
                    confirmButtonText: i18n.translate(
                      'xpack.graph.clearWorkspace.confirmButtonLabel',
                      {
                        defaultMessage: 'Change data source',
                      }
                    ),
                    title: i18n.translate('xpack.graph.clearWorkspace.modalTitle', {
                      defaultMessage: 'Unsaved changes',
                    }),
                  }
                );
              }}
            >
              {currentIndexPattern
                ? currentIndexPattern.getName()
                : // This branch will be shown if the user exits the
                  // initial picker modal
                  i18n.translate('xpack.graph.bar.pickSourceLabel', {
                    defaultMessage: 'Select a data source',
                  })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <QueryStringInput
            timeRangeForSuggestionsOverride={false} // to don't filter suggestions by the global time range
            disableAutoFocus
            bubbleSubmitEvent
            indexPatterns={currentIndexPattern ? [currentIndexPattern] : []}
            placeholder={i18n.translate('xpack.graph.bar.searchFieldPlaceholder', {
              defaultMessage: 'Search your data and add to graph',
            })}
            query={query}
            onChange={setQuery}
            appName={appName}
            deps={{
              unifiedSearch,
              data,
              dataViews,
              storage,
              notifications,
              http,
              docLinks,
              uiSettings,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TooltipWrapper
            condition={!currentIndexPattern || !selectedFields.length}
            tooltipContent={
              !currentIndexPattern
                ? i18n.translate('xpack.graph.bar.exploreLabelNoIndexPattern', {
                    defaultMessage: 'Select a data source',
                  })
                : i18n.translate('xpack.graph.bar.exploreLabelNoFields', {
                    defaultMessage: 'Select at least one field',
                  })
            }
          >
            <EuiButton
              fill
              type="submit"
              disabled={isLoading || !currentIndexPattern || !selectedFields.length}
              data-test-subj="graph-explore-button"
            >
              {i18n.translate('xpack.graph.bar.exploreLabel', { defaultMessage: 'Graph' })}
            </EuiButton>
          </TooltipWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
}

export const SearchBar = connect(
  (state: GraphState) => {
    const datasource = datasourceSelector(state);
    return {
      currentDatasource:
        datasource.current.type === 'indexpattern' ? datasource.current : undefined,
      selectedFields: selectedFieldsSelector(state),
    };
  },
  (dispatch) => ({
    onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => {
      dispatch(
        requestDatasource({
          type: 'indexpattern',
          id: indexPattern.id,
          title: indexPattern.attributes.title,
        })
      );
    },
    submit: (searchTerm: string) => {
      dispatch(submitSearch(searchTerm));
    },
  })
)(SearchBarComponent);
