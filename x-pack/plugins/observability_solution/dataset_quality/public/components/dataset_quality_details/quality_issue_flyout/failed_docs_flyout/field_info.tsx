/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  failedDocsErrorsColumnName,
  overviewDegradedFieldsTableLoadingText,
} from '../../../../../common/translations';
import { useDegradedFields } from '../../../../hooks';

const failedDocsErrorsTableNoData = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.noData',
  {
    defaultMessage: 'No errors found',
  }
);

export const FailedFieldInfo = () => {
  const {
    isDegradedFieldsLoading,
    failedDocsErrorsColumns,
    renderedFailedDocsErrorsItems,
    failedDocsErrorsSort,
    isFailedDocsErrorsLoading,
    resultsCount,
  } = useDegradedFields();

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-cause`}
        direction="column"
        gutterSize="xs"
      >
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{failedDocsErrorsColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause"
          grow={2}
        >
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.datasetQuality.tableSummary"
              defaultMessage="Showing {items}"
              values={{
                items: resultsCount,
              }}
            />
          </EuiText>
          <EuiHorizontalRule margin="xs" />
          <EuiBasicTable
            tableLayout="fixed"
            columns={failedDocsErrorsColumns}
            items={renderedFailedDocsErrorsItems ?? []}
            loading={isFailedDocsErrorsLoading}
            sorting={failedDocsErrorsSort}
            onChange={(e) => {
              console.log(e);
            }}
            data-test-subj="datasetQualityDetailsDegradedFieldTable"
            rowProps={{
              'data-test-subj': 'datasetQualityDetailsDegradedTableRow',
            }}
            noItemsMessage={
              isDegradedFieldsLoading
                ? overviewDegradedFieldsTableLoadingText
                : failedDocsErrorsTableNoData
            }
            pagination={{
              pageIndex: 0,
              pageSize: 5,
              totalItemCount: 5,
            }}
          />
        </EuiFlexItem>
        <EuiHorizontalRule margin="s" />
      </EuiFlexGroup>
    </>
  );
};
