/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { memo, useEffect, useCallback, useRef, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiDataGrid,
  EuiDataGridCellPopoverElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMutationObserver,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import { CoreSetup } from 'src/core/public';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '../../../../common/constants/field_histograms';

import { ANALYSIS_CONFIG_TYPE, INDEX_STATUS } from '../../data_frame_analytics/common';

import {
  euiDataGridStyle,
  euiDataGridToolbarSettings,
  getFeatureImportance,
  getTopClasses,
} from './common';
import { UseIndexDataReturnType } from './types';
import { DecisionPathPopover } from '../../data_frame_analytics/pages/analytics_exploration/components/feature_importance/decision_path_popover';
import {
  FeatureImportanceBaseline,
  FeatureImportance,
  TopClasses,
} from '../../../../common/types/feature_importance';
import { isPopulatedObject } from '../../../../common/util/object_utils';
import { DEFAULT_RESULTS_FIELD } from '../../../../common/constants/data_frame_analytics';
import { DataFrameAnalysisConfigType } from '../../../../common/types/data_frame_analytics';

import './data_grid.scss';
// TODO Fix row hovering + bar highlighting
// import { hoveredRow$ } from './column_chart';

export const DataGridTitle: FC<{ title: string }> = ({ title }) => (
  <EuiTitle size="xs">
    <span>{title}</span>
  </EuiTitle>
);

interface PropsWithoutHeader extends UseIndexDataReturnType {
  baseline?: FeatureImportanceBaseline;
  analysisType?: DataFrameAnalysisConfigType | 'unknown';
  resultsField?: string;
  dataTestSubj: string;
  toastNotifications: CoreSetup['notifications']['toasts'];
}

interface PropsWithHeader extends PropsWithoutHeader {
  copyToClipboard: string;
  copyToClipboardDescription: string;
  title: string;
}

function isWithHeader(arg: any): arg is PropsWithHeader {
  return typeof arg?.title === 'string' && arg?.title !== '';
}

type Props = PropsWithHeader | PropsWithoutHeader;

export const DataGrid: FC<Props> = memo(
  (props) => {
    const {
      baseline,
      chartsVisible,
      chartsButtonVisible,
      ccsWarning,
      columnsWithCharts,
      dataTestSubj,
      errorMessage,
      invalidSortingColumnns,
      noDataMessage,
      onChangeItemsPerPage,
      onChangePage,
      onSort,
      pagination,
      setVisibleColumns,
      renderCellValue,
      rowCount,
      sortingColumns,
      status,
      tableItems: data,
      toastNotifications,
      toggleChartVisibility,
      visibleColumns,
      predictionFieldName,
      resultsField,
      analysisType,
    } = props;
    // TODO Fix row hovering + bar highlighting
    // const getRowProps = (item: any) => {
    //   return {
    //     onMouseOver: () => hoveredRow$.next(item),
    //     onMouseLeave: () => hoveredRow$.next(null),
    //   };
    // };

    const renderCellPopover = useCallback(
      (popoverProps: EuiDataGridCellPopoverElementProps) => {
        const { schema, rowIndex, cellContentsElement, DefaultCellPopover } = popoverProps;
        if (
          analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
          analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION ||
          analysisType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION
        ) {
          if (schema === 'featureImportance') {
            const row = data[rowIndex];
            if (!row) return <div />;
            // if resultsField for some reason is not available then use ml
            const mlResultsField = resultsField ?? DEFAULT_RESULTS_FIELD;
            let predictedValue: string | number | undefined;
            let predictedProbability: number | undefined;
            let topClasses: TopClasses = [];
            if (
              predictionFieldName !== undefined &&
              row &&
              row[`${mlResultsField}.${predictionFieldName}`] !== undefined
            ) {
              predictedValue = row[`${mlResultsField}.${predictionFieldName}`];
              topClasses = getTopClasses(row, mlResultsField);
              predictedProbability = row[`${mlResultsField}.prediction_probability`];
            }

            const isClassTypeBoolean = topClasses.reduce(
              (p, c) => typeof c.class_name === 'boolean' || p,
              false
            );

            const parsedFIArray: FeatureImportance[] = getFeatureImportance(
              row,
              mlResultsField,
              isClassTypeBoolean
            );

            return (
              <div data-test-subj="mlDFAFeatureImportancePopover">
                <DecisionPathPopover
                  analysisType={analysisType}
                  predictedValue={predictedValue}
                  predictedProbability={predictedProbability}
                  baseline={baseline}
                  featureImportance={parsedFIArray}
                  topClasses={topClasses}
                  predictionFieldName={
                    predictionFieldName ? predictionFieldName.replace('_prediction', '') : undefined
                  }
                />
              </div>
            );
          } else if (schema === 'featureInfluence') {
            return <EuiCodeBlock isCopyable={true}>{cellContentsElement.textContent}</EuiCodeBlock>;
          }
        } else {
          return <DefaultCellPopover {...popoverProps} />;
        }
      },
      [baseline, data]
    );

    useEffect(() => {
      if (invalidSortingColumnns.length > 0) {
        invalidSortingColumnns.forEach((columnId) => {
          toastNotifications.addDanger(
            i18n.translate('xpack.ml.dataGrid.invalidSortingColumnError', {
              defaultMessage: `The column '{columnId}' cannot be used for sorting.`,
              values: { columnId },
            })
          );
        });
      }
    }, [invalidSortingColumnns, toastNotifications]);

    const wrapperEl = useRef<HTMLDivElement>(null);

    if (status === INDEX_STATUS.LOADED && data.length === 0) {
      return (
        <div data-test-subj={`${dataTestSubj} empty`}>
          {isWithHeader(props) && <DataGridTitle title={props.title} />}
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutTitle', {
              defaultMessage: 'Empty index query result.',
            })}
            color="primary"
          >
            <p>
              {i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutBody', {
                defaultMessage:
                  'The query for the index returned no results. Please make sure you have sufficient permissions, the index contains documents and your query is not too restrictive.',
              })}
            </p>
          </EuiCallOut>
        </div>
      );
    }

    if (noDataMessage !== '') {
      return (
        <div data-test-subj={`${dataTestSubj} empty`}>
          {isWithHeader(props) && <DataGridTitle title={props.title} />}
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.dataGridNoDataCalloutTitle', {
              defaultMessage: 'Index preview not available',
            })}
            color="primary"
          >
            <p>{noDataMessage}</p>
          </EuiCallOut>
        </div>
      );
    }

    let errorCallout;

    if (status === INDEX_STATUS.ERROR) {
      // if it's a searchBar syntax error leave the table visible so they can try again
      if (errorMessage && !errorMessage.includes('failed to create query')) {
        errorCallout = (
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataframe.analytics.exploration.querySyntaxError', {
              defaultMessage:
                'An error occurred loading the index data. Please ensure your query syntax is valid.',
            })}
            color="danger"
            iconType="cross"
          >
            <p>{errorMessage}</p>
          </EuiCallOut>
        );
      } else {
        errorCallout = (
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.indexDataError', {
              defaultMessage: 'An error occurred loading the index data.',
            })}
            color="danger"
            iconType="cross"
          >
            <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
              {errorMessage}
            </EuiCodeBlock>
          </EuiCallOut>
        );
      }
    }

    const onMutation = () => {
      if (wrapperEl.current !== null) {
        const els = wrapperEl.current.querySelectorAll('.euiDataGrid__virtualized');
        for (const el of Array.from(els)) {
          if (isPopulatedObject(el) && isPopulatedObject(el.style) && el.style.height !== 'auto') {
            el.style.height = 'auto';
          }
        }
      }
    };

    return (
      <div
        data-test-subj={`${dataTestSubj} ${status === INDEX_STATUS.ERROR ? 'error' : 'loaded'}`}
        ref={wrapperEl}
      >
        {isWithHeader(props) && (
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <DataGridTitle title={props.title} />
            </EuiFlexItem>
            {props.copyToClipboard && props.copyToClipboardDescription && (
              <EuiFlexItem grow={false}>
                <EuiCopy
                  beforeMessage={props.copyToClipboardDescription}
                  textToCopy={props.copyToClipboard}
                >
                  {(copy: () => void) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      aria-label={props.copyToClipboardDescription}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
        {errorCallout !== undefined && (
          <div data-test-subj={`${dataTestSubj} error`}>
            {errorCallout}
            <EuiSpacer size="m" />
          </div>
        )}
        {ccsWarning && (
          <div data-test-subj={`${dataTestSubj} ccsWarning`}>
            <EuiCallOut
              title={i18n.translate('xpack.ml.dataGrid.CcsWarningCalloutTitle', {
                defaultMessage: 'Cross-cluster search returned no fields data.',
              })}
              color="warning"
            >
              <p>
                {i18n.translate('xpack.ml.dataGrid.CcsWarningCalloutBody', {
                  defaultMessage:
                    'There was an issue retrieving data for the data view. Source preview in combination with cross-cluster search is only supported for versions 7.10 and above. You may still configure and create the transform.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        )}
        <EuiMutationObserver
          observerOptions={{ subtree: true, attributes: true, childList: true }}
          onMutation={onMutation}
        >
          {(mutationRef) => (
            <div className="mlDataGrid" ref={mutationRef}>
              <EuiDataGrid
                aria-label={isWithHeader(props) ? props.title : ''}
                columns={columnsWithCharts.map((c) => {
                  c.initialWidth = 165;
                  return c;
                })}
                columnVisibility={{ visibleColumns, setVisibleColumns }}
                gridStyle={euiDataGridStyle}
                rowCount={rowCount}
                renderCellValue={renderCellValue}
                renderCellPopover={renderCellPopover}
                sorting={{ columns: sortingColumns, onSort }}
                toolbarVisibility={{
                  ...euiDataGridToolbarSettings,
                  ...(chartsButtonVisible
                    ? {
                        additionalControls: (
                          <EuiToolTip
                            content={i18n.translate(
                              'xpack.ml.dataGrid.histogramButtonToolTipContent',
                              {
                                defaultMessage:
                                  'Queries run to fetch histogram chart data will use a sample size per shard of {samplerShardSize} documents.',
                                values: {
                                  samplerShardSize: DEFAULT_SAMPLER_SHARD_SIZE,
                                },
                              }
                            )}
                          >
                            <EuiButtonEmpty
                              aria-pressed={chartsVisible === true}
                              className={`euiDataGrid__controlBtn${
                                chartsVisible === true ? ' euiDataGrid__controlBtn--active' : ''
                              }`}
                              data-test-subj={`${dataTestSubj}HistogramButton`}
                              size="xs"
                              iconType="visBarVertical"
                              color="text"
                              onClick={toggleChartVisibility}
                              disabled={chartsVisible === undefined}
                            >
                              <FormattedMessage
                                id="xpack.ml.dataGrid.histogramButtonText"
                                defaultMessage="Histogram charts"
                              />
                            </EuiButtonEmpty>
                          </EuiToolTip>
                        ),
                      }
                    : {}),
                }}
                pagination={{
                  ...pagination,
                  pageSizeOptions: [5, 10, 25],
                  onChangeItemsPerPage,
                  onChangePage,
                }}
              />
            </div>
          )}
        </EuiMutationObserver>
      </div>
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: Props) {
  return [
    props.columnsWithCharts,
    props.dataTestSubj,
    props.errorMessage,
    props.invalidSortingColumnns,
    props.noDataMessage,
    props.pagination,
    props.rowCount,
    props.sortingColumns,
    props.status,
    props.tableItems,
    props.visibleColumns,
    ...(isWithHeader(props)
      ? [props.copyToClipboard, props.copyToClipboardDescription, props.title]
      : []),
  ];
}
