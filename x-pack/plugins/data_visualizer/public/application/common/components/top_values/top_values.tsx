/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
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
import { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { css } from '@emotion/react';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { kibanaFieldFormat } from '../utils';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
import { FieldVisStats } from '../../../../../common/types';
import { ExpandedRowPanel } from '../stats_table/components/field_data_expanded_row/expanded_row_panel';
import { EMPTY_EXAMPLE } from '../examples_list/examples_list';

interface Props {
  stats: FieldVisStats | undefined;
  fieldFormat?: any;
  barColor?: 'primary' | 'success' | 'danger' | 'subdued' | 'accent';
  compressed?: boolean;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

function getPercentLabel(percent: number): string {
  if (percent >= 0.1) {
    return `${roundToDecimalPlace(percent, 1)}%`;
  } else {
    return '< 0.1%';
  }
}

export const TopValues: FC<Props> = ({ stats, fieldFormat, barColor, compressed, onAddFilter }) => {
  const {
    services: {
      data: { fieldFormats },
    },
  } = useDataVisualizerKibana();

  if (stats === undefined || !stats.topValues) return null;
  const { topValues: originalTopValues, fieldName, sampleCount } = stats;

  if (originalTopValues?.length === 0) return null;
  const totalDocuments = stats.totalDocuments ?? sampleCount ?? 0;

  const topValues = originalTopValues.map((bucket) => ({
    ...bucket,
    percent:
      typeof bucket.percent === 'number' ? bucket.percent : bucket.doc_count / totalDocuments,
  }));
  const topValuesOtherCountPercent =
    1 - (topValues ? topValues.reduce((acc, bucket) => acc + bucket.percent, 0) : 0);
  const topValuesOtherCount = Math.floor(topValuesOtherCountPercent * (sampleCount ?? 0));

  const countsElement = (
    <EuiText color="subdued" size="xs">
      {totalDocuments > (sampleCount ?? 0) ? (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedFromSampleRecordsLabel"
          defaultMessage="Calculated from {sampledDocumentsFormatted} sample {sampledDocuments, plural, one {record} other {records}}."
          values={{
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
          defaultMessage="Calculated from {totalDocumentsFormatted} {totalDocuments, plural, one {record} other {records}}."
          values={{
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
      )}
    </EuiText>
  );

  return (
    <ExpandedRowPanel
      dataTestSubj={'dataVisualizerFieldDataTopValues'}
      className={classNames('dvPanel__wrapper', compressed ? 'dvPanel--compressed' : undefined)}
    >
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.topValuesLabel"
          defaultMessage="Top values"
        />
      </ExpandedRowFieldHeader>

      <div
        data-test-subj="dataVisualizerFieldDataTopValuesContent"
        className={classNames('fieldDataTopValuesContainer', 'dvTopValues__wrapper')}
      >
        {Array.isArray(topValues)
          ? topValues.map((value) => {
              const fieldValue = value.key_as_string ?? (value.key ? value.key.toString() : '');
              const displayValue = fieldValue ?? EMPTY_EXAMPLE;
              return (
                <EuiFlexGroup gutterSize="xs" alignItems="center" key={displayValue}>
                  <EuiFlexItem data-test-subj="dataVisualizerFieldDataTopValueBar">
                    <EuiProgress
                      value={value.percent}
                      max={1}
                      color={barColor}
                      size="xs"
                      label={value.key ? kibanaFieldFormat(value.key, fieldFormat) : fieldValue}
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
        {topValuesOtherCount > 0 ? (
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
