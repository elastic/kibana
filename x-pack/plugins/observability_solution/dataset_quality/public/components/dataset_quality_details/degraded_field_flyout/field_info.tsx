/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
  formatNumber,
  useEuiTheme,
} from '@elastic/eui';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';

import { NUMBER_FORMAT } from '../../../../common/constants';
import {
  countColumnName,
  degradedFieldCurrentFieldLimitColumnName,
  degradedFieldMaximumCharacterLimitColumnName,
  degradedFieldPotentialCauseColumnName,
  degradedFieldValuesColumnName,
  lastOccurrenceColumnName,
} from '../../../../common/translations';
import { useDegradedFields } from '../../../hooks';
import { SparkPlot } from '../../common/spark_plot';
import { DegradedField } from '../../../../common/api_types';

export const DegradedFieldInfo = ({ fieldList }: { fieldList?: DegradedField }) => {
  const { euiTheme } = useEuiTheme();

  const {
    fieldFormats,
    degradedFieldValues,
    isDegradedFieldsLoading,
    isAnalysisInProgress,
    degradedFieldAnalysisFormattedResult,
    degradedFieldAnalysis,
  } = useDegradedFields();

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

      <EuiFlexGroup data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-cause`}>
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{degradedFieldPotentialCauseColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause"
          grow={2}
        >
          <div>
            <EuiToolTip
              position="top"
              content={degradedFieldAnalysisFormattedResult?.tooltipContent}
            >
              <EuiBadge color="hollow">
                <strong>{degradedFieldAnalysisFormattedResult?.potentialCause}</strong>
              </EuiBadge>
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />

      {!isAnalysisInProgress && degradedFieldAnalysis?.isFieldLimitIssue && (
        <>
          <EuiFlexGroup
            data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-mappingLimit`}
          >
            <EuiFlexItem grow={1}>
              <EuiTitle size="xxs">
                <span>{degradedFieldCurrentFieldLimitColumnName}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem
              data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-mappingLimit"
              grow={2}
            >
              <span>{degradedFieldAnalysis.totalFieldLimit}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" />
        </>
      )}

      {!isAnalysisInProgress &&
        degradedFieldAnalysisFormattedResult?.shouldDisplayIgnoredValuesAndLimit && (
          <>
            <EuiFlexGroup
              data-test-subj={'datasetQualityDetailsDegradedFieldFlyoutFieldsList-characterLimit'}
            >
              <EuiFlexItem grow={1}>
                <EuiTitle size="xxs">
                  <span>{degradedFieldMaximumCharacterLimitColumnName}</span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem
                data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-characterLimit"
                css={{ maxWidth: '64%' }}
                grow={2}
              >
                <span>{degradedFieldAnalysis?.fieldMapping?.ignore_above}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="s" />
            <EuiFlexGroup
              data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-values`}
            >
              <EuiFlexItem grow={1}>
                <EuiTitle size="xxs">
                  <span>{degradedFieldValuesColumnName}</span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem
                data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-values"
                css={{ maxWidth: '64%' }}
                grow={2}
              >
                <EuiBadgeGroup gutterSize="s">
                  {degradedFieldValues?.values.map((value, idx) => (
                    <EuiBadge color="hollow" key={idx}>
                      <EuiTextColor color={euiTheme.colors.vis.euiColorVis3}>
                        <strong>{value}</strong>
                      </EuiTextColor>
                    </EuiBadge>
                  ))}
                </EuiBadgeGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="s" />
          </>
        )}
    </EuiFlexGroup>
  );
};
