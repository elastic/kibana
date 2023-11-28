/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AreaSeries,
  Axis,
  Chart,
  niceTimeFormatByDay,
  Settings,
  timeFormatter,
  Tooltip,
} from '@elastic/charts';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
  type EuiLinkButtonProps,
  type EuiTextProps,
  EuiToolTip,
  EuiToolTipProps,
} from '@elastic/eui';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_COMPLIANCE_SCORE_CHART } from '../test_subjects';
import { statusColors } from '../../../common/constants';
import { RULE_FAILED, RULE_PASSED } from '../../../../common/constants';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import type { Evaluation, PostureTrend, Stats } from '../../../../common/types';
import { useKibana } from '../../../common/hooks/use_kibana';

interface ComplianceScoreChartProps {
  compact?: boolean;
  trend: PostureTrend[];
  data: Stats;
  id: string;
  onEvalCounterClick: (evaluation: Evaluation) => void;
}

const getPostureScorePercentage = (postureScore: number): string => `${Math.round(postureScore)}%`;

const PercentageInfo = ({
  compact,
  postureScore,
}: ComplianceScoreChartProps['data'] & { compact?: ComplianceScoreChartProps['compact'] }) => {
  const { euiTheme } = useEuiTheme();
  const percentage = getPostureScorePercentage(postureScore);

  return (
    <EuiTitle
      css={{
        fontSize: compact ? euiTheme.size.l : euiTheme.size.xxl,
        paddingLeft: compact ? euiTheme.size.s : euiTheme.size.xs,
        marginBottom: compact ? euiTheme.size.s : 'none',
      }}
      data-test-subj={DASHBOARD_COMPLIANCE_SCORE_CHART.COMPLIANCE_SCORE}
    >
      <h3>{percentage}</h3>
    </EuiTitle>
  );
};

const convertTrendToEpochTime = (trend: PostureTrend) => ({
  ...trend,
  timestamp: moment(trend.timestamp).valueOf(),
});

const ComplianceTrendChart = ({ trend }: { trend: PostureTrend[] }) => {
  const epochTimeTrend = trend.map(convertTrendToEpochTime);
  const {
    services: { charts },
  } = useKibana();

  return (
    <Chart>
      <Tooltip
        headerFormatter={({ value }) => (
          <>
            <FormattedDate value={value} month="short" day="numeric" />
            {', '}
            <FormattedTime value={value} />
          </>
        )}
      />
      <Settings
        theme={charts.theme.useChartsTheme()}
        baseTheme={charts.theme.useChartsBaseTheme()}
        showLegend={false}
        legendPosition="right"
        locale={i18n.getLocale()}
      />
      <AreaSeries
        // EuiChart is using this id in the tooltip label
        id="Posture Score"
        data={epochTimeTrend}
        xScaleType="time"
        xAccessor={'timestamp'}
        yAccessors={['postureScore']}
      />
      <Axis
        id="bottom-axis"
        position="bottom"
        tickFormat={timeFormatter(niceTimeFormatByDay(2))}
        ticks={4}
      />
      <Axis
        ticks={3}
        id="left-axis"
        position="left"
        gridLine={{ visible: true }}
        domain={{ min: 0, max: 100 }}
      />
    </Chart>
  );
};

const CounterLink = ({
  text,
  count,
  color,
  onClick,
  tooltipContent,
}: {
  count: number;
  text: string;
  color: EuiTextProps['color'];
  onClick: EuiLinkButtonProps['onClick'];
  tooltipContent: EuiToolTipProps['content'];
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiLink color="text" onClick={onClick} css={{ display: 'flex' }}>
        <EuiText color={color} style={{ fontWeight: euiTheme.font.weight.medium }} size="s">
          <CompactFormattedNumber number={count} abbreviateAbove={999} />
          &nbsp;
        </EuiText>
        <EuiText size="s">{text}</EuiText>
      </EuiLink>
    </EuiToolTip>
  );
};

export const ComplianceScoreChart = ({
  data,
  trend,
  onEvalCounterClick,
  compact,
}: ComplianceScoreChartProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="spaceBetween"
      style={{ height: '100%' }}
      gutterSize="none"
    >
      <EuiFlexItem grow={2}>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <PercentageInfo {...data} compact={compact} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              justifyContent="flexEnd"
              gutterSize="none"
              alignItems="flexStart"
              style={{ paddingRight: euiTheme.size.xl }}
            >
              <CounterLink
                text="passed"
                count={data.totalPassed}
                color={statusColors.passed}
                onClick={() => onEvalCounterClick(RULE_PASSED)}
                tooltipContent={i18n.translate(
                  'xpack.csp.complianceScoreChart.counterLink.passedFindingsTooltip',
                  { defaultMessage: 'Passed findings' }
                )}
              />
              <EuiText size="s">&nbsp;-&nbsp;</EuiText>
              <CounterLink
                text="failed"
                count={data.totalFailed}
                color={statusColors.failed}
                onClick={() => onEvalCounterClick(RULE_FAILED)}
                tooltipContent={i18n.translate(
                  'xpack.csp.complianceScoreChart.counterLink.failedFindingsTooltip',
                  { defaultMessage: 'Failed findings' }
                )}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={6}>
        <ComplianceTrendChart trend={trend} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
