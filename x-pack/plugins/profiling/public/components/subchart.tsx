/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { StackFrameMetadata } from '../../common/profiling';
import { getFieldNameForTopNType, TopNType } from '../../common/stack_traces';
import { CountPerTime, OTHER_BUCKET_LABEL, TopNSample } from '../../common/topn';
import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../hooks/use_profiling_charts_theme';
import { useProfilingParams } from '../hooks/use_profiling_params';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { asNumber } from '../utils/formatters/as_number';
import { asPercentage } from '../utils/formatters/as_percentage';
import { StackFrameSummary } from './stack_frame_summary';

export interface SubChartProps {
  index: number;
  color: string;
  height: number;
  width?: number;
  category: string;
  label: string;
  percentage: number;
  data: CountPerTime[];
  showAxes: boolean;
  metadata: StackFrameMetadata[];
  onShowMoreClick: (() => void) | null;
  style?: React.ComponentProps<typeof EuiFlexGroup>['style'];
  showFrames: boolean;
  padTitle: boolean;
  sample: TopNSample | null;
}

const NUM_DISPLAYED_FRAMES = 5;

export const SubChart: React.FC<SubChartProps> = ({
  index,
  color,
  category,
  label,
  percentage,
  height,
  data,
  width,
  showAxes,
  metadata,
  onShowMoreClick,
  style,
  showFrames,
  padTitle,
  sample,
}) => {
  const theme = useEuiTheme();

  const profilingRouter = useProfilingRouter();

  const { path, query } = useProfilingParams('/stacktraces/{topNType}');

  const href = profilingRouter.link('/stacktraces/{topNType}', {
    path: {
      topNType: TopNType.Traces,
    },
    query: {
      ...query,
      kuery: `${query.kuery ? `(${query.kuery}) AND ` : ''}${getFieldNameForTopNType(
        path.topNType
      )}:"${category}"`,
    },
  });

  const timeZone = useKibanaTimeZoneSetting();

  const { chartsTheme, chartsBaseTheme } = useProfilingChartsTheme();

  const compact = !!onShowMoreClick;

  const displayedFrames = compact
    ? metadata.concat().reverse().slice(0, NUM_DISPLAYED_FRAMES)
    : metadata.concat().reverse();

  const hasMoreFrames = displayedFrames.length < metadata.length;

  let bottomElement: React.ReactElement;

  if (metadata.length > 0) {
    bottomElement = (
      <>
        <EuiFlexItem
          style={{
            backgroundColor: theme.euiTheme.colors.lightestShade,
            padding: theme.euiTheme.size.m,
          }}
        >
          <EuiFlexGroup direction="column" gutterSize="none">
            {displayedFrames.map((frame, frameIndex) => (
              <>
                <EuiFlexItem grow={false} key={frame.FrameID}>
                  <EuiFlexGroup direction="row" alignItems="center">
                    <EuiFlexItem grow={false}>{metadata.indexOf(frame) + 1}</EuiFlexItem>
                    <EuiFlexItem grow>
                      <StackFrameSummary frame={frame} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {frameIndex < displayedFrames.length - 1 || hasMoreFrames ? (
                  <EuiFlexItem grow={false}>
                    <EuiHorizontalRule size="full" margin="s" />
                  </EuiFlexItem>
                ) : null}
              </>
            ))}
          </EuiFlexGroup>

          {hasMoreFrames && !!onShowMoreClick && (
            <EuiButton onClick={onShowMoreClick}>
              {i18n.translate('xpack.profiling.stackTracesView.showMoreTracesButton', {
                defaultMessage: 'Show more',
              })}
            </EuiButton>
          )}
        </EuiFlexItem>
      </>
    );
  } else if (category === OTHER_BUCKET_LABEL && showFrames) {
    bottomElement = (
      <EuiFlexItem grow style={{ padding: theme.euiTheme.size.m }}>
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.profiling.stackTracesView.otherTraces', {
              defaultMessage: '[This summarizes all traces that are too small to display]',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  } else {
    bottomElement = <EuiSpacer size="s" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" style={{ ...style, height: '100%' }}>
      <EuiFlexItem
        grow={false}
        style={{
          ...(padTitle
            ? { padding: theme.euiTheme.size.l, paddingBottom: theme.euiTheme.size.s }
            : {}),
        }}
      >
        <EuiFlexGroup
          direction="row"
          gutterSize="m"
          alignItems="center"
          style={{ overflowWrap: 'anywhere' }}
        >
          <EuiFlexItem grow={false}>
            <EuiBadge color={color}>
              <EuiText color={theme.euiTheme.colors.lightestShade} size="xs">
                {index}
              </EuiText>
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow style={{ alignItems: 'flex-start' }}>
            {showFrames ? (
              <EuiLink onClick={() => onShowMoreClick?.()}>
                <EuiText size="s">{label}</EuiText>
              </EuiLink>
            ) : category === OTHER_BUCKET_LABEL ? (
              <EuiText size="s">{label}</EuiText>
            ) : (
              <EuiLink href={href}>
                <EuiText size="s">{label}</EuiText>
              </EuiLink>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexEnd">
              {sample ? (
                <EuiFlexItem>
                  <EuiText size="m">{asPercentage(sample.Percentage / 100)}</EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <EuiText size={sample ? 'xs' : 's'}>
                  {sample
                    ? i18n.translate('xpack.profiling.stackFrames.subChart.avg', {
                        defaultMessage: 'avg. {percentage}',
                        values: { percentage: asPercentage(percentage / 100) },
                      })
                    : asPercentage(percentage / 100)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ position: 'relative' }}>
        <Chart size={{ height, width }}>
          <Settings
            showLegend={false}
            tooltip={{ showNullValues: false }}
            baseTheme={chartsBaseTheme}
            theme={chartsTheme}
          />
          <AreaSeries
            id={category}
            name={category}
            data={data}
            xAccessor={'Timestamp'}
            yAccessors={['Count']}
            xScaleType={ScaleType.Time}
            timeZone={timeZone}
            yScaleType={ScaleType.Linear}
            curve={CurveType.CURVE_STEP_AFTER}
            color={color}
          />
          {sample ? (
            <LineAnnotation
              id="highlighted_sample"
              domainType={AnnotationDomainType.XDomain}
              dataValues={[{ dataValue: sample.Timestamp }]}
              style={{
                line: {
                  strokeWidth: 2,
                  dash: [4, 4],
                  opacity: 0.5,
                },
              }}
              marker={<EuiIcon type="dot" />}
              markerPosition={Position.Top}
              hideTooltips
            />
          ) : null}
          {showAxes ? (
            <Axis
              id="bottom-axis"
              position="bottom"
              tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')}
            />
          ) : null}
          <Axis
            id="left-axis"
            position="left"
            showGridLines
            tickFormat={(d) => (showAxes ? Number(d).toFixed(0) : '')}
            style={
              showAxes
                ? {}
                : {
                    tickLine: { visible: false },
                    tickLabel: { visible: false },
                    axisTitle: { visible: false },
                  }
            }
          />
        </Chart>
        {!showAxes ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: `rgba(255, 255, 255, 0.75)`,
            }}
          >
            {sample
              ? asNumber(sample.Count!)
              : i18n.translate('xpack.profiling.maxValue', {
                  defaultMessage: 'Max: {max}',
                  values: { max: asNumber(Math.max(...data.map((value) => value.Count ?? 0))) },
                })}
          </div>
        ) : null}
      </EuiFlexItem>
      {bottomElement}
    </EuiFlexGroup>
  );
};
