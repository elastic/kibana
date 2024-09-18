/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { css } from '@emotion/react';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { kibanaFieldFormat } from '../utils';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
import type { FieldVisStats } from '../../../../../common/types';
import { ExpandedRowPanel } from '../stats_table/components/field_data_expanded_row/expanded_row_panel';
import { EMPTY_EXAMPLE } from '../examples_list/examples_list';

interface Props {
  stats: FieldVisStats | undefined;
  fieldFormat?: any;
  barColor?: 'primary' | 'success' | 'danger' | 'subdued' | 'accent';
  compressed?: boolean;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  showSampledValues?: boolean;
}

function getPercentLabel(percent: number): string {
  if (percent >= 0.1) {
    return `${roundToDecimalPlace(percent, 1)}%`;
  } else if (percent === 0) {
    return '0%';
  } else {
    return '< 0.1%';
  }
}

export const TopValues: FC<Props> = ({
  stats,
  fieldFormat,
  barColor,
  compressed,
  onAddFilter,
  /** Top values by default show % of time a value exist in sampled records/rows (i.e. value A exists in 10% of sampled records)
   * showSampledValues: true shows % of times a value exist in all arrays of values that have been flattened
   * Example for 4 records: ["a", "a", "b"], ["b", "b", "c"], "d", "e"
   * "a" exists in 1/4 records (50% - showSampledValues: false),
   * "a" exists in 2/8 sampled values (25% - showSampledValues: true).
   */
  showSampledValues = false,
}) => {
  const {
    services: { fieldFormats },
  } = useDataVisualizerKibana();

  if (stats === undefined || !stats.topValues) return null;
  const { fieldName, sampleCount, approximate } = stats;

  const originalTopValues = (showSampledValues ? stats.sampledValues : stats.topValues) ?? [];
  if (originalTopValues?.length === 0) return null;
  const totalDocuments = showSampledValues
    ? stats.topValuesSampleSize ?? 0
    : Math.min(sampleCount ?? Infinity, stats.totalDocuments ?? Infinity);

  const getMessage = () => {
    if (showSampledValues && stats.topValuesSampleSize !== undefined) {
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedFromSampleValuesLabel"
          defaultMessage="Calculated from {sampledDocumentsFormatted} sample {sampledDocuments, plural, one {value} other {values}}."
          values={{
            sampledDocuments: stats.topValuesSampleSize,
            sampledDocumentsFormatted: (
              <strong>
                {fieldFormats
                  .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                  .convert(stats.topValuesSampleSize)}
              </strong>
            ),
          }}
        />
      );
    }
    /**
     * For ES|QL, where are randomly sampling a subset from source data, then query is excuted on top of that data
     * So the terms we get might not get the initial count
     */
    const method = approximate ? (
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.topValues.estimatedMsg"
        defaultMessage="Estimated"
      />
    ) : (
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedMsg"
        defaultMessage="Calculated"
      />
    );

    return totalDocuments > (sampleCount ?? 0) ? (
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedFromSampleRecordsLabel"
        defaultMessage="{method} from {sampledDocumentsFormatted} sample {sampledDocuments, plural, one {record} other {records}}."
        values={{
          method,
          sampledDocuments: sampleCount,
          sampledDocumentsFormatted: (
            <strong>
              {fieldFormats
                .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                .convert(sampleCount)}
            </strong>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedFromTotalRecordsLabel"
        defaultMessage="{method} from {totalDocumentsFormatted} {totalDocuments, plural, one {record} other {records}}."
        values={{
          method,
          totalDocuments,
          totalDocumentsFormatted: (
            <strong>
              {fieldFormats
                .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                .convert(totalDocuments ?? 0)}
            </strong>
          ),
        }}
      />
    );
  };
  const countsElement = (
    <EuiText color="subdued" size="xs">
      {getMessage()}
    </EuiText>
  );

  const topValues = originalTopValues.map((bucket) => ({
    ...bucket,
    percent:
      typeof bucket.percent === 'number' ? bucket.percent : bucket.doc_count / totalDocuments,
  }));

  const shouldShowOtherCount = approximate !== true;
  const topValuesOtherCountPercent =
    1 - (topValues ? topValues.reduce((acc, bucket) => acc + bucket.percent, 0) : 0);
  const topValuesOtherCount = Math.floor(topValuesOtherCountPercent * (sampleCount ?? 0));

  return (
    <ExpandedRowPanel
      dataTestSubj={'dataVisualizerFieldDataTopValues'}
      className={classNames('dvPanel__wrapper', compressed ? 'dvPanel--compressed' : undefined)}
    >
      <ExpandedRowFieldHeader>
        {showSampledValues ? (
          <FormattedMessage
            id="xpack.dataVisualizer.dataGrid.field.topSampledValuesLabel"
            defaultMessage="Top sampled values"
          />
        ) : (
          <FormattedMessage
            id="xpack.dataVisualizer.dataGrid.field.topValuesLabel"
            defaultMessage="Top values"
          />
        )}
      </ExpandedRowFieldHeader>

      <div
        data-test-subj="dataVisualizerFieldDataTopValuesContent"
        className={classNames('fieldDataTopValuesContainer', 'dvTopValues__wrapper')}
      >
        {Array.isArray(topValues)
          ? topValues.map((value) => {
              const fieldValue = value.key_as_string ?? (value.key ? value.key.toString() : '');
              const displayValue = fieldValue === '' ? EMPTY_EXAMPLE : fieldValue;

              return (
                <EuiFlexGroup gutterSize="xs" alignItems="center" key={displayValue}>
                  <EuiFlexItem data-test-subj="dataVisualizerFieldDataTopValueBar">
                    <EuiProgress
                      value={value.percent}
                      max={1}
                      color={barColor}
                      size="xs"
                      label={value.key ? kibanaFieldFormat(value.key, fieldFormat) : displayValue}
                      className={classNames('eui-textTruncate', 'topValuesValueLabelContainer')}
                      valueText={`${value.doc_count}${
                        totalDocuments !== undefined
                          ? ` (${getPercentLabel(value.percent * 100)})`
                          : ''
                      }`}
                    />
                  </EuiFlexItem>
                  {fieldName !== undefined &&
                  displayValue !== undefined &&
                  onAddFilter !== undefined ? (
                    <div
                      css={css`
                        width: 48px;
                      `}
                    >
                      <EuiButtonIcon
                        iconSize="s"
                        iconType="plusInCircle"
                        onClick={() => onAddFilter(fieldName, fieldValue, '+')}
                        aria-label={i18n.translate(
                          'xpack.dataVisualizer.dataGrid.field.addFilterAriaLabel',
                          {
                            defaultMessage: 'Filter for {fieldName}: "{value}"',
                            values: { fieldName, value: displayValue },
                          }
                        )}
                        data-test-subj={`dvFieldDataTopValuesAddFilterButton-${fieldName}-${displayValue}`}
                        style={{
                          minHeight: 'auto',
                          minWidth: 'auto',
                          paddingRight: 2,
                          paddingLeft: 2,
                          paddingTop: 0,
                          paddingBottom: 0,
                        }}
                      />
                      <EuiButtonIcon
                        iconSize="s"
                        iconType="minusInCircle"
                        onClick={() => onAddFilter(fieldName, fieldValue, '-')}
                        aria-label={i18n.translate(
                          'xpack.dataVisualizer.dataGrid.field.removeFilterAriaLabel',
                          {
                            defaultMessage: 'Filter out {fieldName}: "{value}"',
                            values: { fieldName, value: displayValue },
                          }
                        )}
                        data-test-subj={`dvFieldDataTopValuesExcludeFilterButton-${fieldName}-${displayValue}`}
                        style={{
                          minHeight: 'auto',
                          minWidth: 'auto',
                          paddingTop: 0,
                          paddingBottom: 0,
                          paddingRight: 2,
                          paddingLeft: 2,
                        }}
                      />
                    </div>
                  ) : null}
                </EuiFlexGroup>
              );
            })
          : null}
        {shouldShowOtherCount && topValuesOtherCount > 0 ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" key="other">
            <EuiFlexItem data-test-subj="dataVisualizerFieldDataTopValueBar">
              <EuiProgress
                value={topValuesOtherCount}
                max={totalDocuments}
                color={barColor}
                size="xs"
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.dataGrid.field.topValuesOtherLabel"
                    defaultMessage="Other"
                  />
                }
                className={classNames('eui-textTruncate', 'topValuesValueLabelContainer')}
                valueText={`${topValuesOtherCount}${
                  totalDocuments !== undefined
                    ? ` (${getPercentLabel(topValuesOtherCountPercent * 100)})`
                    : ''
                }`}
              />
            </EuiFlexItem>
            {onAddFilter ? (
              <div
                css={css`
                  width: 48px;
                `}
              />
            ) : null}
          </EuiFlexGroup>
        ) : null}

        <Fragment>
          <EuiSpacer size="xs" />
          {countsElement}
        </Fragment>
      </div>
    </ExpandedRowPanel>
  );
};
