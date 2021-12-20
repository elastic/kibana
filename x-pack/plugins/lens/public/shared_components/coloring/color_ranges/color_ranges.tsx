/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import type { ColorRange, DataBounds } from './types';

import { ColorRangesActions } from './color_ranges_actions';
import { ColorRangeItem } from './color_ranges_item';
import { validateColorRanges } from './utils';

import type { ColorRangeValidation, ColorRangesUpdateFn } from './types';
import { ColorRangesState } from './types';

export interface ColorRangesProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  onChange: (
    colorStops: ColorStop[],
    upperMax: number,
    autoValue: CustomPaletteParamsConfig['autoValue']
  ) => void;
  dataBounds: DataBounds;
}

export function ColorRanges({
  colorRanges,
  onChange,
  dataBounds,
  paletteConfiguration,
}: ColorRangesProps) {
  const [localState, setLocalState] = useState<ColorRangesState>({
    colorRanges,
    autoValue: paletteConfiguration?.autoValue ?? 'none',
  });

  const [colorRangesValidity, setColorRangesValidity] = useState<
    Record<string, ColorRangeValidation>
  >({});

  useEffect(() => {
    setColorRangesValidity(validateColorRanges(localState.colorRanges));
  }, [localState.colorRanges]);

  useDebounce(
    () => {
      const { autoValue: localAutoValue, colorRanges: localColorRanges } = localState;
      const upperMin = ['min', 'all'].includes(localAutoValue)
        ? -Infinity
        : Number(localColorRanges[0].start);

      const upperMax = ['max', 'all'].includes(localAutoValue)
        ? Infinity
        : Number(localColorRanges[localColorRanges.length - 1].end);

      const colorStops = localColorRanges.map((colorRange, i) => ({
        color: colorRange.color,
        stop: i === 0 ? upperMin : colorRange.start && Number(colorRange.start),
      }));

      if (Object.values(validateColorRanges(localColorRanges)).every(({ isValid }) => isValid)) {
        onChange(colorStops, upperMax, localAutoValue);
      }
    },
    250,
    [localState]
  );

  const onChangeColorRanges: ColorRangesUpdateFn = useCallback(
    ({ colorRanges: newColorRanges, autoValue = localState.autoValue }) => {
      setLocalState({ colorRanges: newColorRanges, autoValue });
    },
    [localState.autoValue]
  );

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
            setColorRanges={onChangeColorRanges}
            colorRanges={localState.colorRanges}
            paletteConfiguration={paletteConfiguration}
            dataBounds={dataBounds}
            index={index}
            colorRangeValidation={colorRangesValidity[index]}
            accessor="start"
          />
        ))}
        <ColorRangeItem
          colorRange={localState.colorRanges[colorRanges.length - 1]}
          setColorRanges={onChangeColorRanges}
          colorRanges={localState.colorRanges}
          paletteConfiguration={paletteConfiguration}
          dataBounds={dataBounds}
          index={localState.colorRanges.length - 1}
          colorRangeValidation={colorRangesValidity.last}
          accessor="end"
        />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ColorRangesActions
        setColorRanges={onChangeColorRanges}
        colorRanges={localState.colorRanges}
        dataBounds={dataBounds}
        paletteConfiguration={paletteConfiguration}
      />
    </>
  );
}
