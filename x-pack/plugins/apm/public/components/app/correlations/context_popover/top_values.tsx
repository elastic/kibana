/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { IndexPatternField } from '../../../../../../../../src/plugins/data/common';
import { TopValuesStats } from '../../../../../common/search_strategies/field_stats_types';
import { asPercent } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';

interface Props {
  stats: TopValuesStats;
  barColor?: 'primary' | 'secondary' | 'danger' | 'subdued' | 'accent';
  compressed?: boolean;
  onAddFilter?: (
    field: IndexPatternField | string,
    value: string,
    type: '+' | '-'
  ) => void;
}

export function TopValues({ stats, barColor, onAddFilter }: Props) {
  const {
    topValues,
    topValuesSampleSize,
    topValuesSamplerShardSize,
    count,
    isTopValuesSampled,
    fieldName,
  } = stats;
  const theme = useTheme();

  const progressBarMax = topValuesSampleSize ?? count;
  return (
    <div
      data-test-subj="apmCorrelationsContextPopoverTopValues"
      style={{
        minWidth: `calc(${theme.eui.euiSizeXXL} * 6.5)`,
        maxWidth: `calc(${theme.eui.euiSizeXXL} * 7.5)`,
      }}
    >
      {Array.isArray(topValues) &&
        topValues.map((value) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" key={value.key}>
            <EuiFlexItem data-test-subj="apmCorrelationsContextPopoverTopValueBar">
              <EuiProgress
                value={value.doc_count}
                max={progressBarMax}
                color={barColor}
                size="s"
                label={value.key}
                className="eui-textTruncate"
                aria-label={'value.key'}
                valueText={
                  progressBarMax !== undefined
                    ? asPercent(value.doc_count, progressBarMax)
                    : undefined
                }
              />
            </EuiFlexItem>
            {fieldName !== undefined &&
            value.key !== undefined &&
            onAddFilter !== undefined ? (
              <>
                <EuiButtonIcon
                  iconSize="s"
                  iconType="plusInCircle"
                  onClick={() => {
                    onAddFilter(
                      fieldName,
                      typeof value.key === 'number'
                        ? value.key.toString()
                        : value.key,
                      '+'
                    );
                  }}
                  aria-label={i18n.translate(
                    'xpack.apm.correlations.fieldContextPopover.addFilterAriaLabel',
                    {
                      defaultMessage: 'Filter for {fieldName}: "{value}"',
                      values: { fieldName, value: value.key },
                    }
                  )}
                  data-test-subj={`apmFieldContextTopValuesAddFilterButton-${value.key}-${value.key}`}
                  style={{
                    minHeight: 'auto',
                    width: theme.eui.euiSizeL,
                    paddingRight: 2,
                    paddingLeft: 2,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                />
                <EuiButtonIcon
                  iconSize="s"
                  iconType="minusInCircle"
                  onClick={() => {
                    onAddFilter(
                      fieldName,
                      typeof value.key === 'number'
                        ? value.key.toString()
                        : value.key,
                      '-'
                    );
                  }}
                  aria-label={i18n.translate(
                    'xpack.apm.correlations.fieldContextPopover.removeFilterAriaLabel',
                    {
                      defaultMessage: 'Filter out {fieldName}: "{value}"',
                      values: { fieldName, value: value.key },
                    }
                  )}
                  data-test-subj={`apmFieldContextTopValuesExcludeFilterButton-${value.key}-${value.key}`}
                  style={{
                    minHeight: 'auto',
                    width: theme.eui.euiSizeL,
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
              id="xpack.apm.correlations.fieldContextPopover.topValues.calculatedFromSampleDescription"
              defaultMessage="Calculated from sample of {topValuesSamplerShardSize} documents per shard"
              values={{
                topValuesSamplerShardSize,
              }}
            />
          </EuiText>
        </Fragment>
      )}
    </div>
  );
}
