/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './_classification_exploration.scss';

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useMlKibana } from '../../../../../contexts/kibana';
import { AucRocChart } from '../../../../../components/auc_roc_chart/auc_roc_chart';
import { ErrorCallout } from '../error_callout';
import { DataFrameAnalyticsConfig } from '../../../../common';
import { DataFrameTaskStateType } from '../../../analytics_management/components/analytics_list/common';
import { ResultsSearchQuery } from '../../../../common/analytics';

import { ExpandableSection, HEADER_ITEMS_LOADING } from '../expandable_section';

import {
  getColumnData,
  ACTUAL_CLASS_ID,
  MAX_COLUMNS,
  getTrailingControlColumns,
} from './column_data';

import { isTrainingFilter } from './is_training_filter';
import { useAucRoc } from './use_auc_roc';
import { useConfusionMatrix } from './use_confusion_matrix';

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

  const [columns, setColumns] = useState<any>([]);
  const [columnsData, setColumnsData] = useState<any>([]);
  const [showFullColumns, setShowFullColumns] = useState<boolean>(false);
  const [popoverContents, setPopoverContents] = useState<any>([]);
  const [dataSubsetTitle, setDataSubsetTitle] = useState<SUBSET_TITLE>(SUBSET_TITLE.ENTIRE);
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    columns.map(({ id }: { id: string }) => id)
  );

  const resultsField = jobConfig.dest.results_field;
  const isTraining = isTrainingFilter(searchQuery, resultsField);

  const {
    confusionMatrixData,
    docsCount,
    error: errorConfusionMatrix,
    isLoading: isLoadingConfusionMatrix,
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
      setPopoverContents({
        numeric: ({
          cellContentsElement,
          children,
        }: {
          cellContentsElement: any;
          children: any;
        }) => {
          const rowIndex = children?.props?.rowIndex;
          const colId = children?.props?.columnId;
          const gridItem = columnData[rowIndex];

          if (gridItem !== undefined && colId !== ACTUAL_CLASS_ID) {
            // @ts-ignore
            const count = gridItem[colId];
            return `${count} / ${gridItem.actual_class_doc_count} * 100 = ${cellContentsElement.textContent}`;
          }

          return cellContentsElement.textContent;
        },
      });
    }
  }, [confusionMatrixData]);

  const { aucRocData, error: errorAucRoc, isLoading: isLoadingAucRoc } = useAucRoc(
    jobConfig,
    searchQuery,
    visibleColumns
  );

  const renderCellValue = ({
    rowIndex,
    columnId,
    setCellProps,
  }: {
    rowIndex: number;
    columnId: string;
    setCellProps: any;
  }) => {
    const cellValue = columnsData[rowIndex][columnId];
    const actualCount = columnsData[rowIndex] && columnsData[rowIndex].actual_class_doc_count;
    let accuracy: number | string = '0%';

    if (columnId !== ACTUAL_CLASS_ID && actualCount) {
      accuracy = cellValue / actualCount;
      // round to 2 decimal places without converting to string;
      accuracy = Math.round(accuracy * 100) / 100;
      accuracy = `${Math.round(accuracy * 100)}%`;
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
    return <span>{columnId === ACTUAL_CLASS_ID ? cellValue : accuracy}</span>;
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
                    <EuiFlexGroup gutterSize="none">
                      <EuiTitle size="xxs">
                        <span>{getHelpText(dataSubsetTitle)}</span>
                      </EuiTitle>
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          anchorClassName="mlDataFrameAnalyticsClassificationInfoTooltip"
                          content={i18n.translate(
                            'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixTooltip',
                            {
                              defaultMessage:
                                'The multi-class confusion matrix contains the number of occurrences where the analysis classified data points correctly with their actual class as well as the number of occurrences where it misclassified them with another class',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {/* BEGIN TABLE ELEMENTS */}
                    <EuiSpacer size="m" />
                    <div className="mlDataFrameAnalyticsClassification__confusionMatrix">
                      <div className="mlDataFrameAnalyticsClassification__actualLabel">
                        <EuiText size="xs" color="subdued">
                          <FormattedMessage
                            id="xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixActualLabel"
                            defaultMessage="Actual label"
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
                                  defaultMessage="Predicted label"
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
                                showStyleSelector: false,
                                showFullScreenSelector: false,
                                showSortSelector: false,
                              }}
                              popoverContents={popoverContents}
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
            {/* AUC ROC Chart */}
            {!isLoadingAucRoc && aucRocData.length > 0 ? (
              <>
                {Array.isArray(errorAucRoc) && errorAucRoc.map((e) => <ErrorCallout error={e} />)}
                {errorAucRoc === null && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiFlexGroup gutterSize="none">
                      <EuiTitle size="xxs">
                        <span>AUC ROC</span>
                      </EuiTitle>
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          anchorClassName="mlDataFrameAnalyticsClassificationInfoTooltip"
                          content={i18n.translate(
                            'xpack.ml.dataframe.analytics.classificationExploration.aucRocCurveTooltip',
                            {
                              defaultMessage: 'AUC ROC Help Text',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <AucRocChart data={aucRocData} />
                  </>
                )}
              </>
            ) : null}
          </>
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
