/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  getIndexPatternFromESQLQuery,
  getESQLQueryColumns,
  getESQLAdHocDataview,
  getESQLResults,
} from '@kbn/esql-utils';
import useAsync from 'react-use/lib/useAsync';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { useKibana } from '../../../common/lib/kibana';

function generateId() {
  return uuidv4();
}

const saveVisualizationLabel = i18n.translate('xpack.securitySolution.lensESQLFunction.save', {
  defaultMessage: 'Save visualization',
});

export interface EsqlCodeBlockProps {
  value: string;
  timestamp: string;
  actionsDisabled: boolean;
}

const EsqlCodeBlockComponent = ({ value, actionsDisabled, timestamp }: EsqlCodeBlockProps) => {
  const theme = useEuiTheme();
  const { lens, dataViews: dataViewService, data } = useKibana().services;
  const [showVisualization, setShowVisualization] = useState(false);

  const { value: lensHelpersAsync } = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const { data: queryResults, error: queryResultsError } = useQuery({
    queryKey: ['getESQLResults', value, timestamp],
    enabled: showVisualization,
    queryFn: async () => {
      return getESQLResults({
        esqlQuery: value,
        search: data.search.search,
        filter: {
          range: timestamp
            ? {
                '@timestamp': {
                  lte: timestamp,
                  format: 'strict_date_optional_time',
                },
              }
            : {},
        },
      });
    },
    select: (queryResultsData) => ({
      params: queryResultsData.params,
      rows: queryResultsData.response.values,
      columns: queryResultsData.response.columns,
    }),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const indexPattern = useMemo(() => getIndexPatternFromESQLQuery(value), [value]);
  const { value: formattedColumns, error: formattedColumnsError } = useAsync(
    () =>
      getESQLQueryColumns({
        esqlQuery: value,
        search: data.search.search,
      }),
    [value]
  );

  const { value: dataViewAsync, error: dataViewError } = useAsync(() => {
    return getESQLAdHocDataview(indexPattern, dataViewService).then((dataView) => {
      if (dataView.fields.getByName('@timestamp')?.type === 'date') {
        dataView.timeFieldName = '@timestamp';
      }
      return dataView;
    });
  }, [indexPattern, dataViewService]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>(undefined);

  const preferredChartType = undefined; // 'XY';

  // initialization
  useEffect(() => {
    if (lensHelpersAsync && dataViewAsync && !lensInput && formattedColumns) {
      const context = {
        dataViewSpec: dataViewAsync?.toSpec(),
        fieldName: '',
        textBasedColumns: formattedColumns,
        query: {
          esql: value,
        },
      };

      const chartSuggestions = lensHelpersAsync.suggestions(
        context,
        dataViewAsync,
        [],
        preferredChartType
      );

      if (chartSuggestions?.length) {
        const [suggestion] = chartSuggestions;

        const attrs = getLensAttributesFromSuggestion({
          filters: [],
          query: {
            esql: value,
          },
          suggestion,
          dataView: dataViewAsync,
        }) as TypedLensByValueInput['attributes'];

        const lensEmbeddableInput = {
          attributes: attrs,
          id: generateId(),
        };
        setLensInput(lensEmbeddableInput);
      }
    }
  }, [dataViewAsync, formattedColumns, lensHelpersAsync, lensInput, preferredChartType, value]);

  // if the Lens suggestions api suggests a table then we want to render a Discover table instead
  const isLensInputTable = lensInput?.attributes?.visualizationType === 'lnsDatatable';

  const handleShowVisualization = useCallback(() => setShowVisualization(true), []);

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="s"
        className={css`
          background-color: ${theme.euiTheme.colors.lightestShade};
          .euiCodeBlock__pre {
            margin-bottom: 0;
            padding: ${theme.euiTheme.size.m};
            min-block-size: 48px;
          }
          .euiCodeBlock__controls {
            inset-block-start: ${theme.euiTheme.size.m};
            inset-inline-end: ${theme.euiTheme.size.m};
          }
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiCodeBlock isCopyable fontSize="m" language="sql">
              {value}
            </EuiCodeBlock>
          </EuiFlexItem>

          {!showVisualization && (
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="securityAiAssistantEsqlCodeBlockVisualizeThisQueryButton"
                    size="xs"
                    iconType="lensApp"
                    onClick={handleShowVisualization}
                    disabled={actionsDisabled}
                  >
                    {i18n.translate('xpack.securitySolution.lensESQLFunction.visualizeThisQuery', {
                      defaultMessage: 'Generate Visualization',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
      {showVisualization && (queryResultsError || formattedColumnsError || dataViewError) && (
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EuiCallOut title="Unable to retrieve search results" color="danger" iconType="error">
            <p>{`${queryResultsError || formattedColumnsError || dataViewError}`}</p>
          </EuiCallOut>
        </EuiPanel>
      )}
      {showVisualization && queryResults && formattedColumns && (
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EuiFlexGroup direction="column" gutterSize="xs">
            {!isLensInputTable && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="row" gutterSize="xs" justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          isTableVisible
                            ? i18n.translate(
                                'xpack.securitySolution.lensESQLFunction.visualization',
                                {
                                  defaultMessage: 'Visualization',
                                }
                              )
                            : i18n.translate('xpack.securitySolution.lensESQLFunction.table', {
                                defaultMessage: 'Table of results',
                              })
                        }
                      >
                        <EuiButtonIcon
                          size="xs"
                          iconType={
                            isTableVisible ? 'visBarVerticalStacked' : 'tableDensityExpanded'
                          }
                          onClick={() => setIsTableVisible(!isTableVisible)}
                          data-test-subj="securityAiAssistantLensESQLDisplayTableButton"
                          aria-label={
                            isTableVisible
                              ? i18n.translate(
                                  'xpack.securitySolution.lensESQLFunction.displayChart',
                                  {
                                    defaultMessage: 'Display chart',
                                  }
                                )
                              : i18n.translate(
                                  'xpack.securitySolution.lensESQLFunction.displayTable',
                                  {
                                    defaultMessage: 'Display table',
                                  }
                                )
                          }
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={saveVisualizationLabel}>
                        <EuiButtonIcon
                          size="xs"
                          iconType="save"
                          onClick={() => setIsSaveModalOpen(true)}
                          data-test-subj="securityAiAssistantLensESQLSaveButton"
                          aria-label={saveVisualizationLabel}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  {isTableVisible ? (
                    <ESQLDataGrid
                      rows={queryResults?.rows}
                      columns={formattedColumns ?? []}
                      dataView={dataViewAsync}
                      query={{
                        esql: value,
                      }}
                      flyoutType="overlay"
                      isTableView
                    />
                  ) : lensInput ? (
                    <lens.EmbeddableComponent
                      {...lensInput}
                      style={{
                        height: 240,
                      }}
                    />
                  ) : null}
                </EuiFlexItem>
              </>
            )}
            {/* hide the grid in case of errors (as the user can't fix them) */}
            {isLensInputTable && (
              <EuiFlexItem>
                <ESQLDataGrid
                  rows={queryResults?.rows}
                  columns={formattedColumns}
                  dataView={dataViewAsync}
                  query={{
                    esql: value,
                  }}
                  flyoutType="overlay"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
          // For now, we don't want to allow saving ESQL charts to the library
          isSaveable={false}
        />
      ) : null}
    </>
  );
};

export const EsqlCodeBlock = React.memo(EsqlCodeBlockComponent);
