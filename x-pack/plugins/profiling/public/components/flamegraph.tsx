/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';

import { Chart, ColumnarViewModel, Datum, Flame, PartialTheme, Settings } from '@elastic/charts';

import { FlameGraphContext } from './contexts/flamegraph';

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
        <Chart size={['100%', height]}>
          <Settings theme={theme} />
          <Flame
            id={id}
            columnarData={columnarData}
            valueAccessor={(d: Datum) => d.value as number}
            valueFormatter={(value) => `${value}`}
            animation={{ duration: 250 }}
            controlProviderCallback={{}}
          />
        </Chart>
      )}
    </>
  );
};
