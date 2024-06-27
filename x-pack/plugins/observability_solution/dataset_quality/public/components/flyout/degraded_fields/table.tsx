/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { DegradedField } from '../../../../common/api_types';
import { useKibanaContextForPlugin } from '../../../utils';
import { useDatasetQualityDegradedField, useDatasetQualityFlyout } from '../../../hooks';
import { getDegradedFieldsColumns } from './columns';
import {
  flyoutDegradedFieldsTableLoadingText,
  flyoutDegradedFieldsTableNoData,
} from '../../../../common/translations';

const ignoredAnalysisTitle = i18n.translate(
  'xpack.datasetQuality.flyout.degradedFields.ignoredAnalysis',
  {
    defaultMessage: 'Possible causes and remediations',
  }
);

export const DegradedFieldTable = () => {
  const { isLoading, pagination, renderedItems, onTableChange, sort, fieldFormats } =
    useDatasetQualityDegradedField();
  const { dataStreamStat } = useDatasetQualityFlyout();
  const {
    services: {
      observabilityAIAssistant: {
        ObservabilityAIAssistantContextualInsight,
        getContextualInsightMessages,
      } = {},
    },
  } = useKibanaContextForPlugin();

  const messages = useCallback(
    (fieldName: string) => {
      const content = `You are an expert using Elastic Stack on call being consulted about data set quality and incorrect ingested documents in log datasets. Your job is to take immediate action and proceed with both urgency and precision.
        "Data Set quality" is a concept based on the percentage of degraded documents in each data set. A degraded document in a data set contains the _ignored property because one or more of its fields were ignored during indexing. Fields are ignored for a variety of reasons. For example, when the ignore_malformed parameter is set to true, if a document field contains the wrong data type, the malformed field is ignored and the rest of the document is indexed.
        You are using "Data set quality" and got the degradedDocs percentage on ${dataStreamStat?.rawName} dataset. Determine what was the cause for ${fieldName} field getting ignored.
       
        Do not guess, just say what you are sure of. Do not repeat the given instructions in your output.`;

      return (
        getContextualInsightMessages &&
        getContextualInsightMessages({
          message:
            'Can you identify possible causes and remediations for these log rate analysis results',
          instructions: content,
        })
      );
    },
    [dataStreamStat?.rawName, getContextualInsightMessages]
  );

  const dateFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = useCallback(
    (row: DegradedField) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

      if (itemIdToExpandedRowMapValues[row.name]) {
        delete itemIdToExpandedRowMapValues[row.name];
      } else {
        itemIdToExpandedRowMapValues[row.name] = ObservabilityAIAssistantContextualInsight && (
          <ObservabilityAIAssistantContextualInsight
            title={ignoredAnalysisTitle}
            messages={messages(row.name)!}
            openedByDefault={true}
          />
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [ObservabilityAIAssistantContextualInsight, itemIdToExpandedRowMap, messages]
  );

  const columns = getDegradedFieldsColumns({ dateFormatter, isLoading });
  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<DegradedField>> = useMemo(
    () => [
      ...columns,
      {
        align: 'right',
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>
              {i18n.translate('xpack.datasetQuality.degradedFieldTable.span.expandRowLabel', {
                defaultMessage: 'Expand row',
              })}
            </span>
          </EuiScreenReaderOnly>
        ),
        mobileOptions: { header: false },
        render: (row: DegradedField) => {
          const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

          return (
            <EuiToolTip
              position="top"
              content={
                <p>
                  {i18n.translate('xpack.datasetQuality.degradedField.expand.aiAssistant', {
                    defaultMessage: 'Possible causes and remediations from Elastic AI Assistant.',
                  })}
                </p>
              }
            >
              <EuiButtonEmpty
                size="xs"
                data-test-subj="datasetQualityColumnsWithExpandingRowToggleButton"
                onClick={() => toggleDetails(row)}
                aria-label={itemIdToExpandedRowMapValues[row.name] ? 'Collapse' : 'Expand'}
                iconType={itemIdToExpandedRowMapValues[row.name] ? 'arrowDown' : 'arrowRight'}
              >
                <AssistantAvatar size="xxs" />
              </EuiButtonEmpty>
            </EuiToolTip>
          );
        },
      },
    ],
    [columns, itemIdToExpandedRowMap, toggleDetails]
  );

  return (
    <EuiBasicTable
      tableLayout="fixed"
      columns={columnsWithExpandingRowToggle}
      items={renderedItems ?? []}
      loading={isLoading}
      sorting={sort}
      onChange={onTableChange}
      pagination={pagination}
      data-test-subj="datasetQualityFlyoutDegradedFieldTable"
      rowProps={{
        'data-test-subj': 'datasetQualityFlyoutDegradedTableRow',
      }}
      noItemsMessage={
        isLoading ? (
          flyoutDegradedFieldsTableLoadingText
        ) : (
          <EuiEmptyPrompt
            data-test-subj="datasetQualityFlyoutDegradedTableNoData"
            layout="vertical"
            title={<h2>{flyoutDegradedFieldsTableNoData}</h2>}
            hasBorder={false}
            titleSize="m"
          />
        )
      }
      itemId="name"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
    />
  );
};
