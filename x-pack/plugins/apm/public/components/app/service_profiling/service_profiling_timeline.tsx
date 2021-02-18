/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useChartTheme } from '../../../../../observability/public';
import { ProfilingValueType } from '../../../../common/profiling';

type ProfilingTimelineItem = {
  x: number;
} & { valueTypes: Record<ProfilingValueType | 'unknown', number> };

const labels = {
  unknown: i18n.translate('xpack.apm.serviceProfiling.valueTypeLabel.unknown', {
    defaultMessage: 'Other',
  }),
  [ProfilingValueType.cpuTime]: i18n.translate(
    'xpack.apm.serviceProfiling.valueTypeLabel.cpuTime',
    {
      defaultMessage: 'On-CPU',
    }
  ),
  [ProfilingValueType.wallTime]: i18n.translate(
    'xpack.apm.serviceProfiling.valueTypeLabel.wallTime',
    {
      defaultMessage: 'Wall',
    }
  ),
};

const palette = euiPaletteColorBlind();

export function ServiceProfilingTimeline({
  start,
  end,
  series,
  onValueTypeSelect,
  selectedValueType,
}: {
  series: ProfilingTimelineItem[];
  start: string;
  end: string;
  onValueTypeSelect: (valueType: ProfilingValueType) => void;
  selectedValueType: ProfilingValueType | undefined;
}) {
  const chartTheme = useChartTheme();

  const xFormat = niceTimeFormatter([Date.parse(start), Date.parse(end)]);

  function getSeriesForValueType(type: ProfilingValueType | 'unknown') {
    const label = labels[type];

    return {
      name: label,
      id: type,
      data: series.map((coord) => ({
        x: coord.x,
        y: coord.valueTypes[type],
      })),
    };
  }

  const specs = [
    getSeriesForValueType('unknown'),
    getSeriesForValueType(ProfilingValueType.cpuTime),
    getSeriesForValueType(ProfilingValueType.wallTime),
  ]
    .filter((spec) => spec.data.some((coord) => coord.y > 0))
    .map((spec, index) => {
      return {
        ...spec,
        color: palette[index],
      };
    });

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow>
        <Chart size={{ width: '100%', height: 120 }}>
          <Settings theme={chartTheme} />
          <Axis id="time" position={Position.Bottom} tickFormat={xFormat} />
          <Axis id="count" position={Position.Left} />
          {specs.map((spec) => (
            <BarSeries
              {...spec}
              key={spec.id}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
            />
          ))}
        </Chart>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          alignItems="flexStart"
          justifyContent="flexStart"
        >
          {specs.map((spec) => (
            <EuiFlexItem key={spec.id} grow={false}>
              <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="dot" color={spec.color} />
                </EuiFlexItem>
                <EuiFlexItem grow>
                  <EuiButtonEmpty
                    size="xs"
                    disabled={spec.id === 'unknown'}
                    isSelected={spec.id === selectedValueType}
                    onClick={() => {
                      if (spec.id !== 'unknown') {
                        onValueTypeSelect(spec.id);
                      }
                    }}
                  >
                    <EuiText size="xs">{spec.name}</EuiText>
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
