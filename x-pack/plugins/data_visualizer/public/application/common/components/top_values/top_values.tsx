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
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { css } from '@emotion/react';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { roundToDecimalPlace, kibanaFieldFormat } from '../utils';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
import { FieldVisStats } from '../../../../../common/types';
import { ExpandedRowPanel } from '../stats_table/components/field_data_expanded_row/expanded_row_panel';

interface Props {
  stats: FieldVisStats | undefined;
  fieldFormat?: any;
  barColor?: 'primary' | 'success' | 'danger' | 'subdued' | 'accent';
  compressed?: boolean;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

function getPercentLabel(docCount: number, topValuesSampleSize: number): string {
  const percent = (100 * docCount) / topValuesSampleSize;
  if (percent >= 0.1) {
    return `${roundToDecimalPlace(percent, 1)}%`;
  } else {
    return '< 0.1%';
  }
}

export const TopValues: FC<Props> = ({ stats, fieldFormat, barColor, compressed, onAddFilter }) => {
  const {
    services: { data },
  } = useDataVisualizerKibana();

  const { fieldFormats } = data;

  if (stats === undefined || !stats.topValues) return null;
  const { topValues, isTopValuesSampled, fieldName, sampleCount, topValuesSamplerShardSize } =
    stats;

  const totalDocuments = stats.totalDocuments;

  const topValuesOtherCount =
    (totalDocuments ?? 0) -
    (topValues ? topValues.map((value) => value.doc_count).reduce((v, acc) => acc + v, 0) : 0);

  const countsElement =
    totalDocuments !== undefined ? (
      <EuiText color="subdued" size="xs">
        {isTopValuesSampled ? (
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
    ) : (
      <EuiText size="xs" textAlign={'center'}>
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedFromSampleDescription"
          defaultMessage="Calculated from sample of {topValuesSamplerShardSize} documents per shard"
          values={{
            topValuesSamplerShardSize,
          }}
        />
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
          ? topValues.map((value) => (
              <EuiFlexGroup gutterSize="xs" alignItems="center" key={value.key}>
                <EuiFlexItem data-test-subj="dataVisualizerFieldDataTopValueBar">
                  <EuiProgress
                    value={value.doc_count}
                    max={totalDocuments}
                    color={barColor}
                    size="xs"
                    label={kibanaFieldFormat(value.key, fieldFormat)}
                    className={classNames('eui-textTruncate', 'topValuesValueLabelContainer')}
                    valueText={`${value.doc_count}${
                      totalDocuments !== undefined
                        ? ` (${getPercentLabel(value.doc_count, totalDocuments)})`
                        : ''
                    }`}
                  />
                </EuiFlexItem>
                {fieldName !== undefined && value.key !== undefined && onAddFilter !== undefined ? (
                  <div
                    css={css`
                      width: 48px;
                    `}
                  >
                    <EuiButtonIcon
                      iconSize="s"
                      iconType="plusInCircle"
                      onClick={() =>
                        onAddFilter(
                          fieldName,
                          typeof value.key === 'number' ? value.key.toString() : value.key,
                          '+'
                        )
                      }
                      aria-label={i18n.translate(
                        'xpack.dataVisualizer.dataGrid.field.addFilterAriaLabel',
                        {
                          defaultMessage: 'Filter for {fieldName}: "{value}"',
                          values: { fieldName, value: value.key },
                        }
                      )}
                      data-test-subj={`dvFieldDataTopValuesAddFilterButton-${value.key}-${value.key}`}
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
                      onClick={() =>
                        onAddFilter(
                          fieldName,
                          typeof value.key === 'number' ? value.key.toString() : value.key,
                          '-'
                        )
                      }
                      aria-label={i18n.translate(
                        'xpack.dataVisualizer.dataGrid.field.removeFilterAriaLabel',
                        {
                          defaultMessage: 'Filter out {fieldName}: "{value}"',
                          values: { fieldName, value: value.key },
                        }
                      )}
                      data-test-subj={`dvFieldDataTopValuesExcludeFilterButton-${value.key}-${value.key}`}
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
            ))
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
                    ? ` (${getPercentLabel(topValuesOtherCount, totalDocuments)})`
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

        {isTopValuesSampled === true && (
          <Fragment>
            <EuiSpacer size="xs" />
            {countsElement}
          </Fragment>
        )}
      </div>
    </ExpandedRowPanel>
  );
};
