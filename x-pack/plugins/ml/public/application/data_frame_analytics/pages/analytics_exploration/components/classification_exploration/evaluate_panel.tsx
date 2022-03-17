/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './_classification_exploration.scss';

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useMlKibana } from '../../../../../contexts/kibana';

// Separate imports for lazy loadable VegaChart and related code
import { VegaChart } from '../../../../../components/vega_chart';
import { VegaChartLoading } from '../../../../../components/vega_chart/vega_chart_loading';
import { useCurrentEuiTheme } from '../../../../../components/color_range_legend';

import { ErrorCallout } from '../error_callout';
import { getDependentVar, DataFrameAnalyticsConfig } from '../../../../common';
import { DataFrameTaskStateType } from '../../../analytics_management/components/analytics_list/common';
import { ResultsSearchQuery } from '../../../../common/analytics';

import { ExpandableSection, HEADER_ITEMS_LOADING } from '../expandable_section';

import { EvaluateStat } from './evaluate_stat';
import { EvaluationQualityMetricsTable } from './evaluation_quality_metrics_table';

import { getRocCurveChartVegaLiteSpec } from './get_roc_curve_chart_vega_lite_spec';

import {
  getColumnData,
  getTrailingControlColumns,
  ConfusionMatrixColumn,
  ConfusionMatrixColumnData,
  ACTUAL_CLASS_ID,
  MAX_COLUMNS,
} from './column_data';

import { isTrainingFilter } from './is_training_filter';
import { useRocCurve } from './use_roc_curve';
import { useConfusionMatrix } from './use_confusion_matrix';
import { MulticlassConfusionMatrixHelpPopover } from './confusion_matrix_help_popover';
import { RocCurveHelpPopover } from './roc_curve_help_popover';

export interface EvaluatePanelProps {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DataFrameTaskStateType;
  searchQuery: ResultsSearchQuery;
}

enum SUBSET_TITLE {
  TRAINING = 'training',
  TESTING = 'testing',
  ENTIRE = 'entire',
}

const entireDatasetHelpText = i18n.translate(
  'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixEntireHelpText',
  {
    defaultMessage: 'Normalized confusion matrix for entire dataset',
  }
);

const testingDatasetHelpText = i18n.translate(
  'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixTestingHelpText',
  {
    defaultMessage: 'Normalized confusion matrix for testing dataset',
  }
);

const trainingDatasetHelpText = i18n.translate(
  'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixTrainingHelpText',
  {
    defaultMessage: 'Normalized confusion matrix for training dataset',
  }
);

const evaluationQualityMetricsHelpText = i18n.translate(
  'xpack.ml.dataframe.analytics.classificationExploration.evaluationQualityMetricsHelpText',
  {
    defaultMessage: 'Evaluation quality metrics',
  }
);

function getHelpText(dataSubsetTitle: string): string {
  let helpText = entireDatasetHelpText;
  if (dataSubsetTitle === SUBSET_TITLE.TESTING) {
    helpText = testingDatasetHelpText;
  } else if (dataSubsetTitle === SUBSET_TITLE.TRAINING) {
    helpText = trainingDatasetHelpText;
  }
  return helpText;
}

export const EvaluatePanel: FC<EvaluatePanelProps> = ({ jobConfig, jobStatus, searchQuery }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const { euiTheme } = useCurrentEuiTheme();

  const [columns, setColumns] = useState<ConfusionMatrixColumn[]>([]);
  const [columnsData, setColumnsData] = useState<ConfusionMatrixColumnData[]>([]);
  const [showFullColumns, setShowFullColumns] = useState<boolean>(false);
  const [dataSubsetTitle, setDataSubsetTitle] = useState<SUBSET_TITLE>(SUBSET_TITLE.ENTIRE);
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    columns.map(({ id }: { id: string }) => id)
  );

  const resultsField = jobConfig.dest.results_field;
  const isTraining = isTrainingFilter(searchQuery, resultsField);

  const {
    avgRecall,
    confusionMatrixData,
    docsCount,
    error: errorConfusionMatrix,
    isLoading: isLoadingConfusionMatrix,
    overallAccuracy,
    evaluationMetricsItems,
  } = useConfusionMatrix(jobConfig, searchQuery);

  useEffect(() => {
    if (isTraining === undefined) {
      setDataSubsetTitle(SUBSET_TITLE.ENTIRE);
    } else {
      setDataSubsetTitle(
        isTraining && isTraining === true ? SUBSET_TITLE.TRAINING : SUBSET_TITLE.TESTING
      );
    }
  }, [isTraining]);

  useEffect(() => {
    if (confusionMatrixData.length > 0) {
      const { columns: derivedColumns, columnData } = getColumnData(confusionMatrixData);
      // Initialize all columns as visible
      setVisibleColumns(() => derivedColumns.map(({ id }: { id: string }) => id));
      setColumns(derivedColumns);
      setColumnsData(columnData);
    }
  }, [confusionMatrixData]);

  const {
    rocCurveData,
    classificationClasses,
    error: errorRocCurve,
    isLoading: isLoadingRocCurve,
  } = useRocCurve(
    jobConfig,
    searchQuery,
    columns.map((d) => d.id)
  );

  const renderCellValue = ({
    rowIndex,
    columnId,
    setCellProps,
    schema,
    isDetails,
  }: EuiDataGridCellValueElementProps) => {
    const cellValue =
      columnId === ACTUAL_CLASS_ID
        ? columnsData[rowIndex][columnId]
        : columnsData[rowIndex].predicted_classes_count[columnId];
    const actualCount = columnsData[rowIndex] && columnsData[rowIndex].actual_class_doc_count;
    let accuracy: string = '0%';

    if (columnId !== ACTUAL_CLASS_ID && actualCount && typeof cellValue === 'number') {
      let accuracyNumber: number = cellValue / actualCount;
      // round to 2 decimal places without converting to string;
      accuracyNumber = Math.round(accuracyNumber * 100) / 100;
      accuracy = `${Math.round(accuracyNumber * 100)}%`;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (columnId !== ACTUAL_CLASS_ID) {
        setCellProps({
          style: {
            backgroundColor: `rgba(0, 179, 164, ${accuracy})`,
          },
        });
      }
    }, [rowIndex, columnId, setCellProps]);

    let cellContent = columnId === ACTUAL_CLASS_ID ? cellValue : accuracy;

    // Custom popover content for numeric schemas
    if (isDetails && schema === 'numeric') {
      const gridItem = columnsData[rowIndex];
      if (gridItem !== undefined && columnId !== ACTUAL_CLASS_ID) {
        const count = gridItem.predicted_classes_count[columnId];
        cellContent = `${count} / ${gridItem.actual_class_doc_count} * 100 = ${cellContent}`;
      }
    }

    return <span>{cellContent}</span>;
  };

  const docLink = docLinks.links.ml.classificationEvaluation;

  const showTrailingColumns = columnsData.length > MAX_COLUMNS;
  const extraColumns = columnsData.length - MAX_COLUMNS;
  const shownColumns =
    showTrailingColumns === true && showFullColumns === false
      ? columns.slice(0, MAX_COLUMNS + 1)
      : columns;
  const rowCount =
    showTrailingColumns === true && showFullColumns === false ? MAX_COLUMNS : columnsData.length;

  return (
    <>
      <ExpandableSection
        urlStateKey={'evaluation'}
        dataTestId="ClassificationEvaluation"
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionTitle"
            defaultMessage="Model evaluation"
          />
        }
        docsLink={
          <EuiButtonEmpty
            target="_blank"
            iconType="help"
            iconSide="left"
            color="primary"
            href={docLink}
          >
            {i18n.translate(
              'xpack.ml.dataframe.analytics.classificationExploration.classificationDocsLink',
              {
                defaultMessage: 'Classification evaluation docs ',
              }
            )}
          </EuiButtonEmpty>
        }
        headerItems={
          !isLoadingConfusionMatrix
            ? [
                ...(jobStatus !== undefined
                  ? [
                      {
                        id: 'jobStatus',
                        label: i18n.translate(
                          'xpack.ml.dataframe.analytics.classificationExploration.evaluateJobStatusLabel',
                          {
                            defaultMessage: 'Job status',
                          }
                        ),
                        value: jobStatus,
                      },
                    ]
                  : []),
                ...(docsCount !== null
                  ? [
                      {
                        id: 'docsEvaluated',
                        label: i18n.translate(
                          'xpack.ml.dataframe.analytics.classificationExploration.generalizationDocsCount',
                          {
                            defaultMessage: '{docsCount, plural, one {doc} other {docs}} evaluated',
                            values: { docsCount },
                          }
                        ),
                        value: docsCount,
                      },
                    ]
                  : []),
              ]
            : HEADER_ITEMS_LOADING
        }
        contentPadding={true}
        content={
          <>
            {!isLoadingConfusionMatrix ? (
              <>
                {errorConfusionMatrix !== null && <ErrorCallout error={errorConfusionMatrix} />}
                {errorConfusionMatrix === null && (
                  <>
                    <EuiFlexGroup gutterSize="none" alignItems="center">
                      <EuiTitle size="xxs">
                        <span>{getHelpText(dataSubsetTitle)}</span>
                      </EuiTitle>
                      <EuiFlexItem grow={false}>
                        <MulticlassConfusionMatrixHelpPopover />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {/* BEGIN TABLE ELEMENTS */}
                    <EuiSpacer size="m" />
                    <div className="mlDataFrameAnalyticsClassification__evaluateSectionContent">
                      <div className="mlDataFrameAnalyticsClassification__actualLabel">
                        <EuiText size="xs" color="subdued">
                          <FormattedMessage
                            id="xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixActualLabel"
                            defaultMessage="Actual class"
                          />
                        </EuiText>
                      </div>
                      <div className="mlDataFrameAnalyticsClassification__dataGridMinWidth">
                        {columns.length > 0 && columnsData.length > 0 && (
                          <>
                            <div>
                              <EuiText size="xs" color="subdued">
                                <FormattedMessage
                                  id="xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixPredictedLabel"
                                  defaultMessage="Predicted class"
                                />
                              </EuiText>
                            </div>
                            <EuiSpacer size="s" />
                            <EuiDataGrid
                              data-test-subj="mlDFAnalyticsClassificationExplorationConfusionMatrix"
                              aria-label={i18n.translate(
                                'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixLabel',
                                {
                                  defaultMessage: 'Classification confusion matrix',
                                }
                              )}
                              columns={shownColumns}
                              columnVisibility={{ visibleColumns, setVisibleColumns }}
                              rowCount={rowCount}
                              renderCellValue={renderCellValue}
                              inMemory={{ level: 'sorting' }}
                              toolbarVisibility={{
                                showColumnSelector: true,
                                showDisplaySelector: false,
                                showFullScreenSelector: false,
                                showSortSelector: false,
                              }}
                              gridStyle={{
                                border: 'all',
                                fontSize: 's',
                                cellPadding: 's',
                                stripes: false,
                                rowHover: 'none',
                                header: 'shade',
                              }}
                              trailingControlColumns={
                                showTrailingColumns === true && showFullColumns === false
                                  ? getTrailingControlColumns(extraColumns, setShowFullColumns)
                                  : undefined
                              }
                            />
                          </>
                        )}
                      </div>
                    </div>
                    {/* END TABLE ELEMENTS */}
                  </>
                )}
              </>
            ) : null}
            {/* Accuracy and Recall */}
            <EuiSpacer size="xl" />
            <EuiTitle size="xxs">
              <span>{evaluationQualityMetricsHelpText}</span>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              direction="column"
              justifyContent="center"
              className="mlDataFrameAnalyticsClassification__evaluationMetrics"
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="l">
                  <EuiFlexItem grow={false}>
                    <EvaluateStat
                      dataTestSubj={'mlDFAEvaluateSectionOverallAccuracyStat'}
                      title={overallAccuracy}
                      isLoading={isLoadingConfusionMatrix}
                      description={i18n.translate(
                        'xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionOverallAccuracyStat',
                        {
                          defaultMessage: 'Overall accuracy',
                        }
                      )}
                      tooltipContent={i18n.translate(
                        'xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionOverallAccuracyTooltip',
                        {
                          defaultMessage:
                            'The ratio of the number of correct class predictions to the total number of predictions.',
                        }
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EvaluateStat
                      dataTestSubj={'mlDFAEvaluateSectionAvgRecallStat'}
                      title={avgRecall}
                      isLoading={isLoadingConfusionMatrix}
                      description={i18n.translate(
                        'xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionMeanRecallStat',
                        {
                          defaultMessage: 'Mean recall',
                        }
                      )}
                      tooltipContent={i18n.translate(
                        'xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionAvgRecallTooltip',
                        {
                          defaultMessage:
                            'Mean recall shows how many of the data points that are actual class members were identified correctly as class members.',
                        }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EvaluationQualityMetricsTable evaluationMetricsItems={evaluationMetricsItems} />
              </EuiFlexItem>
            </EuiFlexGroup>
            {/* AUC ROC Chart */}
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiTitle size="xxs">
                <span>
                  <FormattedMessage
                    id="xpack.ml.dataframe.analytics.classificationExploration.evaluateSectionRocTitle"
                    defaultMessage="Receiver operating characteristic (ROC) curve"
                  />
                </span>
              </EuiTitle>
              <EuiFlexItem grow={false}>
                <RocCurveHelpPopover />
              </EuiFlexItem>
            </EuiFlexGroup>
            {Array.isArray(errorRocCurve) && (
              <ErrorCallout
                error={
                  <>
                    {errorRocCurve.map((e) => (
                      <>
                        {e}
                        <br />
                      </>
                    ))}
                  </>
                }
              />
            )}
            {!isLoadingRocCurve && errorRocCurve === null && rocCurveData.length > 0 && (
              <div
                className="mlDataFrameAnalyticsClassification__evaluateSectionContent"
                data-test-subj="mlDFAnalyticsClassificationExplorationRocCurveChart"
              >
                <VegaChart
                  vegaSpec={getRocCurveChartVegaLiteSpec(
                    classificationClasses,
                    rocCurveData,
                    getDependentVar(jobConfig.analysis),
                    euiTheme
                  )}
                />
              </div>
            )}
            {isLoadingRocCurve && <VegaChartLoading />}
          </>
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
