/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, ColumnarViewModel, Datum, Flame, PartialTheme, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useMemo } from 'react';
import { asPercentage } from '../utils/formatters/as_percentage';
import { FlameGraphContext } from './contexts/flamegraph';

function TooltipRow({ value, label }: { value: string; label: string }) {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="row" gutterSize="xs">
        <EuiFlexItem grow={false} style={{ fontWeight: 'bold' }}>
          {label}
        </EuiFlexItem>
        <EuiFlexItem>{value}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function FlameGraphTooltip({
  label,
  countInclusive,
  countExclusive,
  samples,
  totalSamples,
}: {
  samples: number;
  label: string;
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
}) {
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem
          style={{
            width: 400,
            overflowWrap: 'anywhere',
          }}
        >
          {label}
        </EuiFlexItem>
        <EuiFlexItem style={{ whiteSpace: 'nowrap' }}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <TooltipRow
              label={i18n.translate('xpack.profiling.flameGraphTooltip.inclusiveCpuLabel', {
                defaultMessage: `Inclusive CPU:`,
              })}
              value={asPercentage(countInclusive / totalSamples, 1)}
            />
            <TooltipRow
              label={i18n.translate('xpack.profiling.flameGraphTooltip.exclusiveCpuLabel', {
                defaultMessage: `Exclusive CPU:`,
              })}
              value={asPercentage(countExclusive / totalSamples, 1)}
            />
            <TooltipRow
              label={i18n.translate('xpack.profiling.flameGraphTooltip.samplesLabel', {
                defaultMessage: `Samples:`,
              })}
              value={samples.toString()}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export interface FlameGraphProps {
  id: string;
  height: number;
}

const nullColumnarViewModel = {
  label: [],
  value: new Float64Array(),
  color: new Float32Array(),
  position0: new Float32Array(),
  position1: new Float32Array(),
  size0: new Float32Array(),
  size1: new Float32Array(),
};

export const FlameGraph: React.FC<FlameGraphProps> = ({ id, height }) => {
  const ctx = useContext(FlameGraphContext);

  const columnarData = useMemo(() => {
    if (!ctx || !ctx.Label || ctx.Label.length === 0) {
      return nullColumnarViewModel;
    }

    const value = new Float64Array(ctx.Value);
    const position = new Float32Array(ctx.Position);
    const size = new Float32Array(ctx.Size);
    const color = new Float32Array(ctx.Color);

    return {
      label: ctx.Label,
      value,
      color,
      position0: position,
      position1: position,
      size0: size,
      size1: size,
    } as ColumnarViewModel;
  }, [ctx]);

  const theme: PartialTheme = {
    chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
    chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  };

  return (
    <>
      {columnarData.label.length > 0 && (
        <div
          onDoubleClick={() => {
            console.log('onDoubleClick');
          }}
          onClick={() => {
            console.log('onClick');
          }}
        >
          <Chart size={['100%', height]}>
            <Settings
              theme={theme}
              tooltip={{
                customTooltip: (props) => {
                  if (!ctx) {
                    return <></>;
                  }

                  const valueIndex = props.values[0].valueAccessor as number;
                  const label = ctx.Label[valueIndex];
                  const samples = ctx.Value[valueIndex];
                  const countInclusive = ctx.CountInclusive[valueIndex];
                  const countExclusive = ctx.CountExclusive[valueIndex];

                  return (
                    <FlameGraphTooltip
                      label={label}
                      samples={samples}
                      countInclusive={countInclusive}
                      countExclusive={countExclusive}
                      totalSamples={Math.max(1, countInclusive)}
                    />
                  );
                },
              }}
            />
            <Flame
              id={id}
              columnarData={columnarData}
              valueAccessor={(d: Datum) => d.value as number}
              valueFormatter={(value) => `${value}`}
              animation={{ duration: 100 }}
              controlProviderCallback={{}}
            />
          </Chart>
        </div>
      )}
    </>
  );
};
