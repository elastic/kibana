/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { IndexPatternSavedObject, IndexPatternProvider } from '../types';
import { openSourceModal } from '../services/source_modal';
import {
  GraphState,
  datasourceSelector,
  requestDatasource,
  IndexpatternDatasource,
} from '../state_management';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  IndexPattern,
  QueryStringInput,
  IDataPluginServices,
  Query,
  esKuery,
} from '../../../../../src/plugins/data/public';

export interface OuterSearchBarProps {
  isLoading: boolean;
  initialQuery?: string;
  onQuerySubmit: (query: string) => void;

  confirmWipeWorkspace: (
    onConfirm: () => void,
    text?: string,
    options?: { confirmButtonText: string; title: string }
  ) => void;
  indexPatternProvider: IndexPatternProvider;
}

export interface SearchBarProps extends OuterSearchBarProps {
  currentDatasource?: IndexpatternDatasource;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
}

function queryToString(query: Query, indexPattern: IndexPattern) {
  if (query.language === 'kuery' && typeof query.query === 'string') {
    const dsl = esKuery.toElasticsearchQuery(
      esKuery.fromKueryExpression(query.query as string),
      indexPattern
    );
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

export function SearchBarComponent(props: SearchBarProps) {
  const {
    currentDatasource,
    onQuerySubmit,
    isLoading,
    onIndexPatternSelected,
    initialQuery,
    indexPatternProvider,
    confirmWipeWorkspace,
  } = props;
  const [query, setQuery] = useState<Query>({ language: 'kuery', query: initialQuery || '' });
  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern | undefined>(
    undefined
  );

  useEffect(() => {
    async function fetchPattern() {
      if (currentDatasource) {
        setCurrentIndexPattern(await indexPatternProvider.get(currentDatasource.id));
      } else {
        setCurrentIndexPattern(undefined);
      }
    }
    fetchPattern();
  }, [currentDatasource, indexPatternProvider]);

  const kibana = useKibana<IDataPluginServices>();
  const { services, overlays } = kibana;
  const { savedObjects, uiSettings } = services;
  if (!overlays) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isLoading && currentIndexPattern) {
          onQuerySubmit(queryToString(query, currentIndexPattern));
        }
      }}
    >
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <QueryStringInput
            disableAutoFocus
            bubbleSubmitEvent
            indexPatterns={currentIndexPattern ? [currentIndexPattern] : []}
            placeholder={i18n.translate('xpack.graph.bar.searchFieldPlaceholder', {
              defaultMessage: 'Search your data and add to graph',
            })}
            query={query}
            prepend={
              <EuiToolTip
                content={i18n.translate('xpack.graph.bar.pickSourceTooltip', {
                  defaultMessage: 'Select a data source to begin graphing relationships.',
                })}
              >
                <EuiButtonEmpty
                  size="xs"
                  className="gphSearchBar__datasourceButton"
                  data-test-subj="graphDatasourceButton"
                  onClick={() => {
                    confirmWipeWorkspace(
                      () =>
                        openSourceModal(
                          { overlays, savedObjects, uiSettings },
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
                    ? currentIndexPattern.title
                    : // This branch will be shown if the user exits the
                      // initial picker modal
                      i18n.translate('xpack.graph.bar.pickSourceLabel', {
                        defaultMessage: 'Select a data source',
                      })}
                </EuiButtonEmpty>
              </EuiToolTip>
            }
            onChange={setQuery}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            type="submit"
            disabled={isLoading || !currentIndexPattern}
            data-test-subj="graph-explore-button"
          >
            {i18n.translate('xpack.graph.bar.exploreLabel', { defaultMessage: 'Graph' })}
          </EuiButton>
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
  })
)(SearchBarComponent);
