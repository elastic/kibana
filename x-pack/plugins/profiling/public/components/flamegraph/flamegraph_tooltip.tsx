/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TooltipContainer } from '@elastic/charts';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import React from 'react';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { asCost } from '../../utils/formatters/as_cost';
import { asPercentage } from '../../utils/formatters/as_percentage';
import { asWeight } from '../../utils/formatters/as_weight';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { TooltipRow } from './tooltip_row';

interface Props {
  isRoot: boolean;
  label: string;
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  comparisonCountInclusive?: number;
  comparisonCountExclusive?: number;
  comparisonTotalSamples?: number;
  comparisonTotalSeconds?: number;
  onShowMoreClick?: () => void;
  inline: boolean;
  parentLabel?: string;
}

export function FlameGraphTooltip({
  isRoot,
  label,
  countInclusive,
  countExclusive,
  totalSamples,
  totalSeconds,
  baselineScaleFactor,
  comparisonScaleFactor,
  comparisonCountInclusive,
  comparisonCountExclusive,
  comparisonTotalSamples,
  comparisonTotalSeconds,
  onShowMoreClick,
  inline,
  parentLabel,
}: Props) {
  const theme = useEuiTheme();
  const calculateImpactEstimates = useCalculateImpactEstimate();

  const impactEstimates = calculateImpactEstimates({
    countExclusive,
    countInclusive,
    totalSamples,
    totalSeconds,
  });

  const comparisonImpactEstimates =
    isNumber(comparisonCountExclusive) &&
    isNumber(comparisonCountInclusive) &&
    isNumber(comparisonTotalSamples) &&
    isNumber(comparisonTotalSeconds)
      ? calculateImpactEstimates({
          countExclusive: comparisonCountExclusive,
          countInclusive: comparisonCountInclusive,
          totalSamples: comparisonTotalSamples,
          totalSeconds: comparisonTotalSeconds,
        })
      : undefined;

  return (
    <TooltipContainer>
      <EuiPanel paddingSize="s">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <EuiText>{label}</EuiText>
            </EuiTitle>
          </EuiFlexItem>

          <EuiHorizontalRule margin="none" style={{ background: theme.euiTheme.border.color }} />
          {inline && (
            <EuiCallOut
              css={css`
                p {
                  display: flex;
                }
              `}
              color="primary"
              title={
                <EuiText size="xs">
                  {i18n.translate('xpack.profiling.flameGraphTooltip.inlineCallout', {
                    defaultMessage: 'This function has been inlined by {parentLabel}',
                    values: { parentLabel },
                  })}
                </EuiText>
              }
              size="s"
              iconType="iInCircle"
            />
          )}
          {isRoot === false && (
            <>
              <TooltipRow
                label={
                  <CPULabelWithHint
                    type="total"
                    labelSize="xs"
                    iconSize="s"
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                }
                value={impactEstimates.totalCPU.percentage}
                comparison={comparisonImpactEstimates?.totalCPU.percentage}
                formatValue={asPercentage}
                showDifference
                formatDifferenceAsPercentage
              />
              <TooltipRow
                label={
                  <CPULabelWithHint
                    type="self"
                    labelSize="xs"
                    iconSize="s"
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                }
                value={impactEstimates.selfCPU.percentage}
                comparison={comparisonImpactEstimates?.selfCPU.percentage}
                showDifference
                formatDifferenceAsPercentage
                formatValue={asPercentage}
              />
            </>
          )}
          <TooltipRow
            label={i18n.translate('xpack.profiling.flameGraphTooltip.samplesLabel', {
              defaultMessage: `Samples`,
            })}
            value={
              isNumber(baselineScaleFactor) ? countInclusive * baselineScaleFactor : countInclusive
            }
            comparison={
              isNumber(comparisonCountInclusive) && isNumber(comparisonScaleFactor)
                ? comparisonCountInclusive * comparisonScaleFactor
                : undefined
            }
            showDifference
            formatDifferenceAsPercentage={false}
          />
          <TooltipRow
            label={i18n.translate('xpack.profiling.flameGraphTooltip.annualizedCo2', {
              defaultMessage: `Annualized CO2`,
            })}
            value={impactEstimates.totalCPU.annualizedCo2}
            comparison={comparisonImpactEstimates?.totalCPU.annualizedCo2}
            formatValue={asWeight}
            showDifference
            formatDifferenceAsPercentage={false}
          />
          <TooltipRow
            label={i18n.translate('xpack.profiling.flameGraphTooltip.annualizedDollarCost', {
              defaultMessage: `Annualized dollar cost`,
            })}
            value={impactEstimates.totalCPU.annualizedDollarCost}
            comparison={comparisonImpactEstimates?.totalCPU.annualizedDollarCost}
            formatValue={asCost}
            showDifference
            formatDifferenceAsPercentage={false}
          />
          {onShowMoreClick && (
            <>
              <EuiHorizontalRule
                margin="none"
                style={{ background: theme.euiTheme.border.color }}
              />
              <EuiFlexItem>
                <EuiButtonEmpty
                  data-test-subj="profilingFlameGraphTooltipButton"
                  size="s"
                  iconType="inspect"
                  onClick={onShowMoreClick}
                >
                  <EuiText size="xs">
                    {i18n.translate('xpack.profiling.flameGraphTooltip.showMoreButton', {
                      defaultMessage: `Show more information`,
                    })}
                  </EuiText>
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="iInCircle" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="xs">
                      {i18n.translate('xpack.profiling.flameGraphTooltip.rightClickTip', {
                        defaultMessage: `Right-click to pin tooltip`,
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </TooltipContainer>
  );
}
