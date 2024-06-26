/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
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
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

function generateId() {
  return uuidv4();
}

const saveVisualizationLabel = i18n.translate('xpack.cases.lensESQLFunction.save', {
  defaultMessage: 'Save visualization',
});

interface EsqlCodeBlockProps {
  value: string;
  timestamp: string;
  actionsDisabled: boolean;
}

const EsqlCodeBlockComponent: React.FC<EsqlCodeBlockProps> = ({
  value,
  actionsDisabled = false,
  timestamp,
}) => {
  const { lens, dataViews: dataViewService, data } = useKibana().services;
  const theme = useEuiTheme();

  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const { data: queryResults } = useQuery({
    queryKey: ['test'],
    enabled: true,
    queryFn: async () => {
      return getESQLResults({
        esqlQuery: value,
        search: data.search.search,
        filter: {
          range: {
            '@timestamp': {
              lte: timestamp,
              format: 'strict_date_optional_time',
            },
          },
        },
      });
    },
    select: (dataz) => {
      return {
        params: dataz.params,
        rows: dataz.response.values,
        columns: dataz.response.columns,
      };
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const indexPattern = getIndexPatternFromESQLQuery(value);
  const formattedColumns = useAsync(
    () =>
      getESQLQueryColumns({
        esqlQuery: value,
        search: data.search.search,
      }),
    [value]
  );

  const dataViewAsync = useAsync(() => {
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
  const [showVisualization, setShowVisualization] = useState(false);

  const preferredChartType = undefined; // 'XY';

  // initialization
  useEffect(() => {
    if (lensHelpersAsync.value && dataViewAsync.value && !lensInput && formattedColumns.value) {
      const context = {
        dataViewSpec: dataViewAsync.value?.toSpec(),
        fieldName: '',
        textBasedColumns: formattedColumns.value,
        query: {
          esql: value,
        },
      };

      const chartSuggestions = lensHelpersAsync.value.suggestions(
        context,
        dataViewAsync.value,
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
          dataView: dataViewAsync.value,
        }) as TypedLensByValueInput['attributes'];

        const lensEmbeddableInput = {
          attributes: attrs,
          id: generateId(),
        };
        setLensInput(lensEmbeddableInput);
      }
    }
  }, [
    dataViewAsync.value,
    formattedColumns.value,
    lensHelpersAsync.value,
    lensInput,
    preferredChartType,
    value,
  ]);

  // if the Lens suggestions api suggests a table then we want to render a Discover table instead
  const isLensInputTable = lensInput?.attributes?.visualizationType === 'lnsDatatable';

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
            <EuiCodeBlock isCopyable fontSize="m">
              {value}
            </EuiCodeBlock>
          </EuiFlexItem>

          {!showVisualization && (
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="casesEsqlCodeBlockVisualizeThisQueryButton"
                    size="xs"
                    iconType="lensApp"
                    onClick={() => setShowVisualization(true)}
                    disabled={actionsDisabled}
                  >
                    {i18n.translate('xpack.cases.lensESQLFunction.visualizeThisQuery', {
                      defaultMessage: 'Generate Visualization',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>

      {showVisualization && queryResults && formattedColumns.value && (
        <>
          {!isLensInputTable && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        isTableVisible
                          ? i18n.translate('xpack.cases.lensESQLFunction.visualization', {
                              defaultMessage: 'Visualization',
                            })
                          : i18n.translate('xpack.cases.lensESQLFunction.table', {
                              defaultMessage: 'Table of results',
                            })
                      }
                    >
                      <EuiButtonIcon
                        size="xs"
                        iconType={isTableVisible ? 'visBarVerticalStacked' : 'tableDensityExpanded'}
                        onClick={() => setIsTableVisible(!isTableVisible)}
                        data-test-subj="observabilityAiAssistantLensESQLDisplayTableButton"
                        aria-label={
                          isTableVisible
                            ? i18n.translate('xpack.cases.lensESQLFunction.displayChart', {
                                defaultMessage: 'Display chart',
                              })
                            : i18n.translate('xpack.cases.lensESQLFunction.displayTable', {
                                defaultMessage: 'Display table',
                              })
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
                        data-test-subj="observabilityAiAssistantLensESQLSaveButton"
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
                    columns={formattedColumns.value ?? []}
                    dataView={dataViewAsync.value}
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
                columns={formattedColumns.value}
                dataView={dataViewAsync.value}
                query={{
                  esql: value,
                }}
                flyoutType="overlay"
              />
            </EuiFlexItem>
          )}
        </>
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

EsqlCodeBlockComponent.displayName = 'EsqlCodeBlock';

export const EsqlCodeBlock = React.memo(EsqlCodeBlockComponent);

// eslint-disable-next-line react/display-name
export const getEsqlRenderer = (timestamp: string | undefined) => (props) =>
  (
    <>
      <EsqlCodeBlock {...props} timestamp={timestamp} />
      <EuiSpacer size="m" />
    </>
  );
