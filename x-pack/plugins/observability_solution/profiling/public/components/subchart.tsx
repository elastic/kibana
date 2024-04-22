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
  Tooltip,
} from '@elastic/charts';
import {
  EuiAccordion,
  EuiAccordionProps,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { StackFrameMetadata } from '@kbn/profiling-utils';
import { groupBy } from 'lodash';
import React, { Fragment, useMemo, useState } from 'react';
import { CountPerTime, OTHER_BUCKET_LABEL, TopNSample } from '../../common/topn';
import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../hooks/use_profiling_charts_theme';
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
  metadata?: StackFrameMetadata[];
  onClick?: () => void;
  style?: EuiFlexGroupProps['style'];
  showFrames: boolean;
  padTitle: boolean;
  sample: TopNSample | null;
}

const NUM_DISPLAYED_FRAMES = 5;

function renderFrameItem(frame: StackFrameMetadata, parentIndex: number | string) {
  return (
    <EuiFlexItem grow={false} key={frame.FrameID}>
      <EuiFlexGroup direction="row" alignItems="center">
        <EuiFlexItem grow={false}>{parentIndex}</EuiFlexItem>
        <EuiFlexItem grow>
          <StackFrameSummary frame={frame} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

export function SubChart({
  index,
  color,
  category,
  label,
  percentage,
  height,
  data,
  width,
  showAxes,
  metadata = [],
  onClick,
  style,
  showFrames,
  padTitle,
  sample,
}: SubChartProps) {
  const theme = useEuiTheme();
  const [accordionState, setAccordionState] = useState<
    Record<string, EuiAccordionProps['forceState']>
  >({});

  const timeZone = useKibanaTimeZoneSetting();

  const { chartsTheme, chartsBaseTheme } = useProfilingChartsTheme();

  const compact = !!onClick;

  const parentsMetadata = metadata.filter((item) => item.Inline === false);
  const displayedFrames = compact
    ? parentsMetadata.concat().reverse().slice(0, NUM_DISPLAYED_FRAMES)
    : parentsMetadata.concat().reverse();

  const childrenMetadata = useMemo(() => {
    const groupedMetadata = groupBy(metadata, 'AddressOrLine');
    return Object.keys(groupedMetadata).reduce<Record<string, StackFrameMetadata[]>>((acc, key) => {
      // Removes the first item as it will always be the parent item.
      const [_, ...children] = groupedMetadata[key];
      acc[key] = children;
      return acc;
    }, {});
  }, [metadata]);

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
            {displayedFrames.map((frame, frameIndex) => {
              const parentIndex = parentsMetadata.indexOf(frame) + 1;
              const children = childrenMetadata[frame.AddressOrLine].concat().reverse();
              const key = [frameIndex, frame.FrameID].join('|');
              const currentAccordionState = accordionState[key];
              return (
                <Fragment key={key}>
                  {children.length > 0 ? (
                    <EuiAccordion
                      // taking over the control of the EuiAccordion state
                      // to avoid rendering the children items when the accordion is closed.
                      // This renders the page way faster as it avoids unnecessary render of items that might never be visible
                      forceState={currentAccordionState || 'closed'}
                      onToggle={(isOpen) => {
                        setAccordionState((state) => ({
                          ...state,
                          [key]: isOpen ? 'open' : 'closed',
                        }));
                      }}
                      css={css`
                        display: flex;
                        flex-direction: column-reverse;

                        .css-bknxw4-euiButtonIcon-xs-empty-text-euiAccordion__arrow-left-isOpen {
                          transform: rotate(-90deg) !important;
                        }
                      `}
                      id={`accordion_${frame.AddressOrLine}`}
                      buttonContent={renderFrameItem(frame, parentIndex)}
                      paddingSize="s"
                      extraAction={
                        <EuiToolTip
                          content={i18n.translate(
                            'xpack.profiling.traces.subChart.inlineDescription',
                            {
                              defaultMessage:
                                'This frame has {numberOfChildren} inline {numberOfChildren, plural, one {frame} other {frames}} inside, this allows for optimised processes.',
                              values: { numberOfChildren: children.length },
                            }
                          )}
                        >
                          <EuiBadge color="primary">{`-> ${children.length}`}</EuiBadge>
                        </EuiToolTip>
                      }
                    >
                      {currentAccordionState === 'open' ? (
                        <EuiFlexGroup
                          direction="column"
                          gutterSize="s"
                          style={{ marginLeft: '12px' }}
                        >
                          {children.map((child, childIndex) => {
                            return (
                              <Fragment key={[key, childIndex].join('|')}>
                                {renderFrameItem(
                                  child,
                                  `${parentIndex}.${children.length - childIndex} ->`
                                )}
                              </Fragment>
                            );
                          })}
                        </EuiFlexGroup>
                      ) : null}
                    </EuiAccordion>
                  ) : (
                    renderFrameItem(frame, parentIndex)
                  )}
                  {frameIndex < displayedFrames.length - 1 || hasMoreFrames ? (
                    <EuiFlexItem grow={false}>
                      <EuiHorizontalRule size="full" margin="s" />
                    </EuiFlexItem>
                  ) : null}
                </Fragment>
              );
            })}
          </EuiFlexGroup>

          {hasMoreFrames && !!onClick && (
            <EuiButton data-test-subj="profilingSubChartShowMoreButton" onClick={onClick}>
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
            {category === OTHER_BUCKET_LABEL || onClick === undefined ? (
              <EuiText size="s">{label}</EuiText>
            ) : (
              <EuiLink data-test-subj="profilingSubChartLink" onClick={onClick}>
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
          <Tooltip showNullValues={false} />
          <Settings
            showLegend={false}
            baseTheme={chartsBaseTheme}
            theme={chartsTheme}
            locale={i18n.getLocale()}
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
            gridLine={{ visible: true }}
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
}
