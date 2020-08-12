/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useContext, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiCodeEditor,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
} from '@elastic/eui';
import {
  ANALYSIS_CONFIG_TYPE,
  getAnalysisType,
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
} from '../../../common/analytics';
import { getColumnData } from '../../analytics_exploration/components/classification_exploration/column_data';
import { CytoscapeContext } from './cytoscape';
import { JOB_MAP_NODE_TYPES } from '../common';
import { DeleteButton } from './delete_button';

interface Props {
  analyticsId: string;
  details: any;
  getNodeData: any;
}

export const Controls: FC<Props> = ({ analyticsId, details, getNodeData }) => {
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<cytoscape.NodeSingular | undefined>(undefined);
  const [evalData, setEvalData] = useState<any>(undefined);
  const [columns, setColumns] = useState<any>([]);
  const [popoverContents, setPopoverContents] = useState<any>([]);
  const [columnsData, setColumnsData] = useState<any>([]);
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.map(({ id }: { id: string }) => id)
  );

  const cy = useContext(CytoscapeContext);
  const deselect = useCallback(() => {
    if (cy) {
      cy.elements().unselect();
    }
    setShowFlyout(false);
    setSelectedNode(undefined);
  }, [cy, setSelectedNode]);

  const nodeId = selectedNode?.data('id');
  const nodeLabel = selectedNode?.data('label');
  const nodeType = selectedNode?.data('type');

  const fetchEvalData = async () => {
    try {
      const jobConfig = details[nodeId];
      const isTraining = false; // We only care about test data here
      const index = Array.isArray(jobConfig?.dest?.index)
        ? jobConfig?.dest?.index[0]
        : jobConfig?.dest?.index;
      const dependentVariable = getDependentVar(jobConfig?.analysis);
      const resultsField = jobConfig?.dest?.results_field;
      const predictionFieldName = getPredictionFieldName(jobConfig?.analysis);
      const jobType = getAnalysisType(jobConfig?.analysis) as ANALYSIS_CONFIG_TYPE;

      const results = await loadEvalData({
        isTraining,
        index,
        dependentVariable,
        resultsField,
        predictionFieldName,
        jobType,
        requiresKeyword: true,
      });

      if (results.error) {
        // eslint-disable-next-line
        console.log('EVAL ERROR ', results.error);
      }

      if (results.success && results.eval) {
        const confusionMatrix =
          // @ts-ignore
          results.eval.classification?.multiclass_confusion_matrix?.confusion_matrix;
        setEvalData(confusionMatrix);
      }
    } catch (error) {
      // eslint-disable-next-line
      console.log('--- ERROR YO ----', error); // remove
    }
  };

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = (event) => {
      setSelectedNode(event.target);
      setShowFlyout(true);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
      // cy.on('data viewport', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        // cy.removeListener('data viewport', undefined, deselect);
      }
    };
  }, [cy, deselect]);

  useEffect(() => {
    if (evalData && evalData.length > 0) {
      const { columns: derivedColumns, columnData } = getColumnData(evalData);
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

          if (gridItem !== undefined) {
            const count = colId === gridItem.actual_class ? gridItem.count : gridItem.error_count;
            return `${count} / ${gridItem.actual_class_doc_count} * 100 = ${cellContentsElement.textContent}`;
          }

          return cellContentsElement.textContent;
        },
      });
    }
  }, [evalData]);

  useEffect(() => {
    setEvalData([]);
    // TODO: only fetch eval data if it's an analytics job
    if (selectedNode !== undefined) {
      fetchEvalData();
    }
  }, [selectedNode]);

  if (showFlyout === false) {
    return null;
  }

  // @ts-ignore
  const content = JSON.stringify(details[nodeId], null, 2);

  const nodeDataButton =
    analyticsId !== nodeLabel && nodeType === JOB_MAP_NODE_TYPES.ANALYTICS ? (
      <EuiButtonEmpty
        onClick={() => {
          getNodeData(nodeLabel);
          setShowFlyout(false);
        }}
        iconType="branch"
      >
        {i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.fetchRelatedNodesButton', {
          defaultMessage: 'Fetch related nodes',
        })}
      </EuiButtonEmpty>
    ) : null;

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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      setCellProps({
        style: {
          backgroundColor: `rgba(0, 179, 164, ${cellValue})`,
        },
      });
    }, [rowIndex, columnId, setCellProps]);
    return (
      <span>{typeof cellValue === 'number' ? `${Math.round(cellValue * 100)}%` : cellValue}</span>
    );
  };

  return (
    <EuiFlyout
      size="m"
      onClose={() => setShowFlyout(false)}
      data-test-subj="mlAnalyticsJobMapFlyout"
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3 data-test-subj="mlDataFrameAnalyticsNodeDetailsTitle">
                {i18n.translate('xpack.ml.dataframe.analyticsMap.flyoutHeaderTitle', {
                  defaultMessage: 'Details for {type} {id}',
                  values: { id: nodeLabel, type: nodeType },
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>{nodeDataButton}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DeleteButton id={nodeLabel} type={nodeType} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="s">
          {evalData !== undefined && evalData.length > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <span>
                    {i18n.translate('xpack.ml.dataframe.analyticsMap.confusionMatrixHelpText', {
                      defaultMessage: 'Normalized confusion matrix',
                    })}
                  </span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiDataGrid
                  data-test-subj="mlDFAnalyticsClassificationExplorationConfusionMatrix"
                  aria-label="Classification confusion matrix"
                  columns={columns}
                  columnVisibility={{ visibleColumns, setVisibleColumns }}
                  rowCount={columnsData.length}
                  renderCellValue={renderCellValue}
                  inMemory={{ level: 'sorting' }}
                  toolbarVisibility={false}
                  popoverContents={popoverContents}
                  gridStyle={{ rowHover: 'none' }}
                />
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem grow={false}>
            <EuiCodeEditor
              mode="json"
              width="100%"
              value={content}
              setOptions={{
                fontSize: '12px',
              }}
              theme="textmate"
              isReadOnly
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analyticsMap.flyout.codeEditorAriaLabel',
                {
                  defaultMessage: 'Analytics job map node details',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
