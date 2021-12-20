/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import type { ColorRange, DataBounds } from './types';

import { ColorRangesActions } from './color_ranges_actions';
import { ColorRangeItem } from './color_ranges_item';
import { validateColorRanges } from './utils';

import type { ColorRangeValidation, ColorRangesUpdateFn } from './types';

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

export function ColorRanges(props: ColorRangesProps) {
  const { colorRanges, onChange, dataBounds, paletteConfiguration } = props;

  const [colorRangesValidity, setColorRangesValidity] = useState<
    Record<string, ColorRangeValidation>
  >({});

  const onChangeWithValidation: ColorRangesUpdateFn = useCallback(
    ({ colorRanges: newColorRanges, autoValue = paletteConfiguration?.autoValue ?? 'none' }) => {
      const upperMin = ['min', 'all'].includes(autoValue)
        ? -Infinity
        : Number(newColorRanges[0].start);

      const upperMax = ['max', 'all'].includes(autoValue)
        ? Infinity
        : Number(newColorRanges[newColorRanges.length - 1].end);

      const colorStops = newColorRanges.map((colorRange, i) => ({
        color: colorRange.color,
        stop: i === 0 ? upperMin : colorRange.start && Number(colorRange.start),
      }));

      onChange(colorStops, upperMax, autoValue);
    },
    [onChange, paletteConfiguration?.autoValue]
  );

  useEffect(() => {
    setColorRangesValidity(validateColorRanges(colorRanges));
  }, [colorRanges]);

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`dynamicColoring_custom_color_ranges`}
        direction="column"
        gutterSize="s"
      >
        {colorRanges.map((colorRange, index) => (
          <ColorRangeItem
            key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}
            colorRange={colorRange}
            setColorRanges={onChangeWithValidation}
            colorRanges={colorRanges}
            paletteConfiguration={paletteConfiguration}
            dataBounds={dataBounds}
            index={index}
            colorRangeValidation={colorRangesValidity[index]}
            accessor="start"
          />
        ))}
        <ColorRangeItem
          colorRange={colorRanges[colorRanges.length - 1]}
          setColorRanges={onChangeWithValidation}
          colorRanges={colorRanges}
          paletteConfiguration={paletteConfiguration}
          dataBounds={dataBounds}
          index={colorRanges.length - 1}
          colorRangeValidation={colorRangesValidity.last}
          accessor="end"
        />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ColorRangesActions
        setColorRanges={onChangeWithValidation}
        colorRanges={colorRanges}
        dataBounds={dataBounds}
        paletteConfiguration={paletteConfiguration}
      />
    </>
  );
}
