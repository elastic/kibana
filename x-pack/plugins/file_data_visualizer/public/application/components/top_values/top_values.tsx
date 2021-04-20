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
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import classNames from 'classnames';
import { roundToDecimalPlace, kibanaFieldFormat } from '../utils';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
import { FieldVisStats } from '../stats_table/types';

interface Props {
  stats: FieldVisStats | undefined;
  fieldFormat?: any;
  barColor?: 'primary' | 'secondary' | 'danger' | 'subdued' | 'accent';
  compressed?: boolean;
}

function getPercentLabel(docCount: number, topValuesSampleSize: number): string {
  const percent = (100 * docCount) / topValuesSampleSize;
  if (percent >= 0.1) {
    return `${roundToDecimalPlace(percent, 1)}%`;
  } else {
    return '< 0.1%';
  }
}

export const TopValues: FC<Props> = ({ stats, fieldFormat, barColor, compressed }) => {
  if (stats === undefined) return null;
  const {
    topValues,
    topValuesSampleSize,
    topValuesSamplerShardSize,
    count,
    isTopValuesSampled,
  } = stats;
  const progressBarMax = isTopValuesSampled === true ? topValuesSampleSize : count;
  return (
    <EuiFlexItem data-test-subj={'mlTopValues'}>
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.fileDataVisualizer.fieldDataCard.topValuesLabel"
          defaultMessage="Top values"
        />
      </ExpandedRowFieldHeader>

      <div data-test-subj="mlFieldDataTopValues" className={'fieldDataTopValuesContainer'}>
        {Array.isArray(topValues) &&
          topValues.map((value) => (
            <EuiFlexGroup gutterSize="xs" alignItems="center" key={value.key}>
              <EuiFlexItem
                grow={false}
                className={classNames(
                  'eui-textTruncate',
                  'topValuesValueLabelContainer',
                  `topValuesValueLabelContainer--${compressed === true ? 'small' : 'large'}`
                )}
              >
                <EuiToolTip content={kibanaFieldFormat(value.key, fieldFormat)} position="right">
                  <EuiText size="xs" textAlign={'right'} color="subdued">
                    {kibanaFieldFormat(value.key, fieldFormat)}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem data-test-subj="mlFieldDataTopValueBar">
                <EuiProgress
                  value={value.doc_count}
                  max={progressBarMax}
                  color={barColor}
                  size="m"
                />
              </EuiFlexItem>
              {progressBarMax !== undefined && (
                <EuiFlexItem
                  grow={false}
                  className={classNames('eui-textTruncate', 'topValuesPercentLabelContainer')}
                >
                  <EuiText size="xs" textAlign="left" color="subdued">
                    {getPercentLabel(value.doc_count, progressBarMax)}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ))}
        {isTopValuesSampled === true && (
          <Fragment>
            <EuiSpacer size="xs" />
            <EuiText size="xs" textAlign={'left'}>
              <FormattedMessage
                id="xpack.fileDataVisualizer.fieldDataCard.topValues.calculatedFromSampleDescription"
                defaultMessage="Calculated from sample of {topValuesSamplerShardSize} documents per shard"
                values={{
                  topValuesSamplerShardSize,
                }}
              />
            </EuiText>
          </Fragment>
        )}
      </div>
    </EuiFlexItem>
  );
};
