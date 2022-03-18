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
  EuiSpacer,
  EuiText,
  EuiButtonIcon,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { roundToDecimalPlace, kibanaFieldFormat } from '../utils';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
import { FieldVisStats } from '../../../../../common/types';
import { ExpandedRowPanel } from '../stats_table/components/field_data_expanded_row/expanded_row_panel';
import { DataViewField } from '../../../../../../../../src/plugins/data_views/public';

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
  if (stats === undefined || !stats.topValues) return null;
  const {
    topValues,
    topValuesSampleSize,
    topValuesSamplerShardSize,
    count,
    isTopValuesSampled,
    fieldName,
  } = stats;

  const progressBarMax = isTopValuesSampled === true ? topValuesSampleSize : count;
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
        {Array.isArray(topValues) &&
          topValues.map((value) => (
            <EuiFlexGroup gutterSize="xs" alignItems="center" key={value.key}>
              <EuiFlexItem data-test-subj="dataVisualizerFieldDataTopValueBar">
                <EuiProgress
                  value={value.doc_count}
                  max={progressBarMax}
                  color={barColor}
                  size="xs"
                  label={kibanaFieldFormat(value.key, fieldFormat)}
                  className={classNames('eui-textTruncate', 'topValuesValueLabelContainer')}
                  valueText={`${value.doc_count}${
                    progressBarMax !== undefined
                      ? ` (${getPercentLabel(value.doc_count, progressBarMax)})`
                      : ''
                  }`}
                />
              </EuiFlexItem>
              {fieldName !== undefined && value.key !== undefined && onAddFilter !== undefined ? (
                <>
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
                </>
              ) : null}
            </EuiFlexGroup>
          ))}
        {isTopValuesSampled === true && (
          <Fragment>
            <EuiSpacer size="xs" />
            <EuiText size="xs" textAlign={'center'}>
              <FormattedMessage
                id="xpack.dataVisualizer.dataGrid.field.topValues.calculatedFromSampleDescription"
                defaultMessage="Calculated from sample of {topValuesSamplerShardSize} documents per shard"
                values={{
                  topValuesSamplerShardSize,
                }}
              />
            </EuiText>
          </Fragment>
        )}
      </div>
    </ExpandedRowPanel>
  );
};
