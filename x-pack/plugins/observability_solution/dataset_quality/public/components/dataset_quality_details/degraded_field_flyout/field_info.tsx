/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSkeletonRectangle,
  EuiTextColor,
  EuiTitle,
  formatNumber,
} from '@elastic/eui';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';

import { NUMBER_FORMAT } from '../../../../common/constants';
import {
  countColumnName,
  degradedFieldValuesColumnName,
  lastOccurrenceColumnName,
} from '../../../../common/translations';
import { useDegradedFields } from '../../../hooks';
import { SparkPlot } from '../../common/spark_plot';

export const DegradedFieldInfo = () => {
  const {
    renderedItems,
    fieldFormats,
    expandedDegradedField,
    degradedFieldValues,
    isDegradedFieldsLoading,
    isDegradedFieldsValueLoading,
  } = useDegradedFields();

  const dateFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);

  const fieldList = useMemo(() => {
    return renderedItems.find((item) => {
      return item.name === expandedDegradedField;
    });
  }, [renderedItems, expandedDegradedField]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexGroup data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCount`}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>{countColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-docCount">
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
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>{lastOccurrenceColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-lastOccurrence">
          <span>{dateFormatter.convert(fieldList?.lastOccurrence)}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-values`}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>{degradedFieldValuesColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-values"
          grow={false}
          css={{ maxWidth: '49%' }}
        >
          <EuiSkeletonRectangle isLoading={isDegradedFieldsValueLoading} width="300px">
            <EuiBadgeGroup gutterSize="s">
              {degradedFieldValues?.values.map((value) => (
                <EuiBadge color="hollow">
                  <EuiTextColor color="#765B96">
                    <strong>{value}</strong>
                  </EuiTextColor>
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          </EuiSkeletonRectangle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
    </EuiFlexGroup>
  );
};
