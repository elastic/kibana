/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle, formatNumber } from '@elastic/eui';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';

import { NUMBER_FORMAT } from '../../../../common/constants';
import { countColumnName, lastOccurrenceColumnName } from '../../../../common/translations';
import { useDegradedFields } from '../../../hooks';
import { SparkPlot } from '../../common/spark_plot';
import { QualityIssue } from '../../../../common/api_types';

export const QualityIssueFieldInfo = ({
  fieldList,
  children,
}: {
  fieldList?: QualityIssue;
  children?: React.ReactNode;
}) => {
  const { fieldFormats, isDegradedFieldsLoading } = useDegradedFields();

  const dateFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexGroup data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCount`}>
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{countColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-docCount"
          grow={2}
        >
          <SparkPlot
            series={fieldList?.timeSeries}
            valueLabel={formatNumber(fieldList?.count, NUMBER_FORMAT)}
            isLoading={isDegradedFieldsLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup
        data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-lastOccurrence`}
      >
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{lastOccurrenceColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-lastOccurrence"
          grow={2}
        >
          <span>{dateFormatter.convert(fieldList?.lastOccurrence)}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {children}
    </EuiFlexGroup>
  );
};
