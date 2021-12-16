/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { htmlIdGenerator, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { isValidColor } from '../utils';
import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import { useDebouncedValue } from '../../index';
import type { ColorRange, DataBounds } from './types';

import { ColorRangesActions } from './color_ranges_actions';
import { ColorRangeItem } from './color_ranges_item';

const idGeneratorFn = htmlIdGenerator();

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

function areStopsValid(colorStops: Array<{ color: string; stop: number }>) {
  return colorStops.every(({ color, stop }) => !Number.isNaN(stop) && isValidColor(color));
}

export function ColorRanges(props: ColorRangesProps) {
  const { colorRanges, onChange, dataBounds, paletteConfiguration } = props;
  const [isValid, setValid] = useState(true);
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  const autoValue = paletteConfiguration?.autoValue ?? 'none';

  const onChangeWithValidation = (newColorRanges: ColorRange[]) => {
    const upperMin = ['min', 'all'].includes(autoValue!)
      ? -Infinity
      : Number(newColorRanges[0].start);
    const colorStops = newColorRanges.map((colorRange, i) => {
      return {
        color: colorRange.color,
        stop: i === 0 ? upperMin : colorRange.start && Number(colorRange.start),
      };
    });
    const upperMax = ['max', 'all'].includes(autoValue!)
      ? Infinity
      : Number(newColorRanges[newColorRanges.length - 1].end);
    if (areStopsValid(colorStops)) {
      onChange(colorStops, upperMax, autoValue);
    }
  };

  const memoizedValues = useMemo(() => {
    return colorRanges.map(({ color, start, end }, i) => ({
      color,
      start,
      end,
      id: idGeneratorFn(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteConfiguration?.name, paletteConfiguration?.reverse, paletteConfiguration?.rangeType]);

  const { inputValue: localColorRanges, handleInputChange: setColorRanges } = useDebouncedValue({
    onChange: onChangeWithValidation,
    value: memoizedValues,
  });

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        data-test-subj={`dynamicColoring_custom_color_ranges`}
        direction="column"
        gutterSize="s"
      >
        {localColorRanges.map((colorRange, index) => (
          <ColorRangeItem
            key={colorRange.id}
            colorRange={colorRange}
            setColorRanges={setColorRanges}
            colorRanges={localColorRanges}
            paletteConfiguration={paletteConfiguration}
            dataBounds={dataBounds}
            index={index}
            isValid={isValid}
            setValid={setValid}
            popoverInFocus={popoverInFocus}
            setPopoverInFocus={setPopoverInFocus}
            isLast={false}
          />
        ))}
        <ColorRangeItem
          colorRange={localColorRanges[localColorRanges.length - 1]}
          setColorRanges={setColorRanges}
          colorRanges={localColorRanges}
          paletteConfiguration={paletteConfiguration}
          dataBounds={dataBounds}
          index={localColorRanges.length - 1}
          isValid={isValid}
          setValid={setValid}
          popoverInFocus={popoverInFocus}
          setPopoverInFocus={setPopoverInFocus}
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
