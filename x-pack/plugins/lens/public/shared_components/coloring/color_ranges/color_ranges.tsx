/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useReducer } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { last } from 'lodash';

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { ColorRangesFooter } from './color_ranges_footer';
import { ColorRangeItem } from './color_ranges_item';
import { colorRangesReducer } from './color_ranges_reducer';
import { validateColorRanges } from './utils';

import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import type { ColorRange, DataBounds, ColorRangeValidation } from './types';

export interface ColorRangesProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  onChange: (
    colorStops: ColorStop[],
    upperMax: number,
    continuity: CustomPaletteParamsConfig['continuity']
  ) => void;
  dataBounds: DataBounds;
}

const toLocalState = (
  colorRanges: ColorRangesProps['colorRanges'],
  paletteConfiguration: ColorRangesProps['paletteConfiguration']
) => ({
  colorRanges,
  rangeType: paletteConfiguration?.rangeType ?? 'percent',
  continuity: paletteConfiguration?.continuity ?? 'none',
});

export function ColorRanges({
  colorRanges,
  onChange,
  dataBounds,
  paletteConfiguration,
}: ColorRangesProps) {
  const [localState, dispatch] = useReducer(
    colorRangesReducer,
    toLocalState(colorRanges, paletteConfiguration)
  );

  const [colorRangesValidity, setColorRangesValidity] = useState<
    Record<string, ColorRangeValidation>
  >({});

  useEffect(() => {
    setColorRangesValidity(validateColorRanges(localState.colorRanges));
  }, [localState.colorRanges]);

  useEffect(() => {
    if (paletteConfiguration?.rangeType !== localState.rangeType) {
      dispatch({
        type: 'set',
        payload: toLocalState(colorRanges, paletteConfiguration),
      });
    }
  }, [colorRanges, localState.rangeType, paletteConfiguration, paletteConfiguration?.rangeType]);

  useDebounce(
    () => {
      const { continuity: localContinuity = 'none', colorRanges: localColorRanges } = localState;
      const upperMin = ['below', 'all'].includes(localContinuity)
        ? -Infinity
        : Number(localColorRanges[0].start);

      const upperMax = ['above', 'all'].includes(localContinuity)
        ? Infinity
        : Number(localColorRanges[localColorRanges.length - 1].end);

      const colorStops = localColorRanges.map((colorRange, i) => ({
        color: colorRange.color,
        stop: i === 0 ? upperMin : colorRange.start && Number(colorRange.start),
      }));

      if (Object.values(validateColorRanges(localColorRanges)).every(({ isValid }) => isValid)) {
        onChange(colorStops, upperMax, localContinuity);
      }
    },
    250,
    [localState]
  );

  const lastColorRange = last(localState.colorRanges);

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`dynamicColoring_custom_color_ranges`}
        direction="column"
        gutterSize="s"
      >
        {localState.colorRanges.map((colorRange, index) => (
          <ColorRangeItem
            key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}
            colorRange={colorRange}
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            continuity={localState.continuity}
            rangeType={localState.rangeType}
            dataBounds={dataBounds}
            index={index}
            colorRangeValidation={colorRangesValidity[index]}
            accessor="start"
          />
        ))}
        {lastColorRange ? (
          <ColorRangeItem
            colorRange={lastColorRange}
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            continuity={localState.continuity}
            rangeType={localState.rangeType}
            dataBounds={dataBounds}
            index={localState.colorRanges.length - 1}
            colorRangeValidation={colorRangesValidity.last}
            accessor="end"
          />
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ColorRangesFooter
        dispatch={dispatch}
        colorRanges={localState.colorRanges}
        dataBounds={dataBounds}
        paletteConfiguration={paletteConfiguration}
      />
    </>
  );
}
