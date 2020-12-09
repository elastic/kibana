/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { ErrorCallout } from '../error_callout';
import {
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  loadDocsCount,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';
import { DataFrameTaskStateType } from '../../../analytics_management/components/analytics_list/common';
import {
  isResultsSearchBoolQuery,
  isClassificationEvaluateResponse,
  ConfusionMatrix,
  ResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';

import { ExpandableSection, HEADER_ITEMS_LOADING } from '../expandable_section';

import {
  getColumnData,
  ACTUAL_CLASS_ID,
  MAX_COLUMNS,
  getTrailingControlColumns,
} from './column_data';

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

function getHelpText(dataSubsetTitle: string) {
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confusionMatrixData, setConfusionMatrixData] = useState<ConfusionMatrix[]>([]);
  const [columns, setColumns] = useState<any>([]);
  const [columnsData, setColumnsData] = useState<any>([]);
  const [showFullColumns, setShowFullColumns] = useState<boolean>(false);
  const [popoverContents, setPopoverContents] = useState<any>([]);
  const [docsCount, setDocsCount] = useState<null | number>(null);
  const [error, setError] = useState<null | string>(null);
  const [dataSubsetTitle, setDataSubsetTitle] = useState<SUBSET_TITLE>(SUBSET_TITLE.ENTIRE);
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.map(({ id }: { id: string }) => id)
  );

  const index = jobConfig.dest.index;
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;
  let requiresKeyword = false;

  const loadData = async ({ isTraining }: { isTraining: boolean | undefined }) => {
    setIsLoading(true);

    try {
      requiresKeyword = isKeywordAndTextType(dependentVariable);
    } catch (e) {
      // Additional error handling due to missing field type is handled by loadEvalData
      console.error('Unable to load new field types', error); // eslint-disable-line no-console
    }

    const evalData = await loadEvalData({
      isTraining,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
      requiresKeyword,
    });

    const docsCountResp = await loadDocsCount({
      isTraining,
      searchQuery,
      resultsField,
      destIndex: jobConfig.dest.index,
    });

    if (
      evalData.success === true &&
      evalData.eval &&
      isClassificationEvaluateResponse(evalData.eval)
    ) {
      const confusionMatrix =
        evalData.eval?.classification?.multiclass_confusion_matrix?.confusion_matrix;
      setError(null);
      setConfusionMatrixData(confusionMatrix || []);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setConfusionMatrixData([]);
      setError(evalData.error);
    }

    if (docsCountResp.success === true) {
      setDocsCount(docsCountResp.docsCount);
    } else {
      setDocsCount(null);
    }
  };

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

  useEffect(() => {
    let isTraining: boolean | undefined;
    const query =
      isResultsSearchBoolQuery(searchQuery) && (searchQuery.bool.should || searchQuery.bool.filter);

    if (query !== undefined && query !== false) {
      for (let i = 0; i < query.length; i++) {
        const clause = query[i];

        if (clause.match && clause.match[`${resultsField}.is_training`] !== undefined) {
          isTraining = clause.match[`${resultsField}.is_training`];
          break;
        } else if (
          clause.bool &&
          (clause.bool.should !== undefined || clause.bool.filter !== undefined)
        ) {
          const innerQuery = clause.bool.should || clause.bool.filter;
          if (innerQuery !== undefined) {
            for (let j = 0; j < innerQuery.length; j++) {
              const innerClause = innerQuery[j];
              if (
                innerClause.match &&
                innerClause.match[`${resultsField}.is_training`] !== undefined
              ) {
                isTraining = innerClause.match[`${resultsField}.is_training`];
                break;
              }
            }
          }
        }
      }
    }
    if (isTraining === undefined) {
      setDataSubsetTitle(SUBSET_TITLE.ENTIRE);
    } else {
      setDataSubsetTitle(
        isTraining && isTraining === true ? SUBSET_TITLE.TRAINING : SUBSET_TITLE.TESTING
      );
    }

    loadData({ isTraining });
  }, [JSON.stringify(searchQuery)]);

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

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

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
            href={`${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-classification`}
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
          !isLoading
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
          !isLoading ? (
            <>
              {error !== null && <ErrorCallout error={error} />}
              {error === null && (
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
                </>
              )}
              {/* END TABLE ELEMENTS */}
            </>
          ) : null
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
