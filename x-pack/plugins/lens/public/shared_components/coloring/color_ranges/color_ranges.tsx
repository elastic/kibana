/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import { useDebouncedValue } from '../../index';
import type { ColorRange, DataBounds } from './types';

import { ColorRangesActions } from './color_ranges_actions';
import { ColorRangeItem } from './color_ranges_item';
import { validateColorRanges } from './utils';
import type { AutoValueMode, ColorRangeValidation } from './types';

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

  const [autoValue, setAutoValue] = useState<AutoValueMode>(
    paletteConfiguration?.autoValue ?? 'none'
  );

  const onChangeWithValidation = (newColorRanges: ColorRange[]) => {
    const upperMin = ['min', 'all'].includes(autoValue!)
      ? -Infinity
      : Number(newColorRanges[0].start);

    const colorStops = newColorRanges.map((colorRange, i) => ({
      color: colorRange.color,
      stop: i === 0 ? upperMin : colorRange.start && Number(colorRange.start),
    }));

    const upperMax = ['max', 'all'].includes(autoValue!)
      ? Infinity
      : Number(newColorRanges[newColorRanges.length - 1].end);

    if (Object.values(validateColorRanges(localColorRanges)).every(({ isValid }) => isValid)) {
      onChange(colorStops, upperMax, autoValue);
    }
  };

  const { inputValue: localColorRanges, handleInputChange: setColorRanges } = useDebouncedValue({
    onChange: onChangeWithValidation,
    value: colorRanges,
  });

  useEffect(() => {
    setColorRangesValidity(validateColorRanges(localColorRanges));
  }, [localColorRanges]);

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`dynamicColoring_custom_color_ranges`}
        direction="column"
        gutterSize="s"
      >
        {localColorRanges.map((colorRange, index) => (
          <ColorRangeItem
            key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}
            colorRange={colorRange}
            setColorRanges={setColorRanges}
            colorRanges={localColorRanges}
            paletteConfiguration={paletteConfiguration}
            dataBounds={dataBounds}
            index={index}
            autoValue={autoValue}
            setAutoValue={setAutoValue}
            colorRangeValidation={colorRangesValidity[index]}
            isLast={false}
          />
        ))}
        <ColorRangeItem
          colorRange={localColorRanges[localColorRanges.length - 1]}
          setColorRanges={setColorRanges}
          colorRanges={localColorRanges}
          paletteConfiguration={paletteConfiguration}
          dataBounds={dataBounds}
          autoValue={autoValue}
          setAutoValue={setAutoValue}
          index={localColorRanges.length - 1}
          colorRangeValidation={colorRangesValidity.last}
          isLast={true}
        />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ColorRangesActions
        setColorRanges={setColorRanges}
        colorRanges={localColorRanges}
        dataBounds={dataBounds}
        paletteConfiguration={paletteConfiguration}
      />
    </>
  );
}
