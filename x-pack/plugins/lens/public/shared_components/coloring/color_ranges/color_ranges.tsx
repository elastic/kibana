/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { last } from 'lodash';
import React, { useState, useEffect, useReducer } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { EuiFlexGroup, EuiTextColor, EuiFlexItem } from '@elastic/eui';

import { ColorRangesFooter } from './color_ranges_footer';
import { ColorRangeItem } from './color_ranges_item';
import { colorRangesReducer } from './color_ranges_reducer';
import { validateColorRanges } from './utils';

import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import type { ColorRange, DataBounds, ColorRangeValidation, ColorRangesState } from './types';

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
): ColorRangesState => ({
  colorRanges,
  rangeType: paletteConfiguration?.rangeType ?? 'percent',
  continuity: paletteConfiguration?.continuity ?? 'none',
});

const getErrorMessages = (colorRangesValidity: Record<string, ColorRangeValidation>) => {
  return [
    ...new Set(
      Object.values(colorRangesValidity).reduce<ColorRangeValidation['errors']>(
        (acc, item) => [...acc, ...item.errors],
        []
      )
    ),
  ].map((item) => {
    switch (item) {
      case 'invalidColor':
      case 'invalidValue':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidValueOrColor', {
          defaultMessage: 'At least one color range contains the wrong value or color',
        });
      case 'greaterThanMaxValue':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidMaxValue', {
          defaultMessage: 'Maximum value should be greater than preceding values',
        });
      default:
        return '';
    }
  });
};

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

  useUpdateEffect(() => {
    if (paletteConfiguration) {
      const { rangeType } = paletteConfiguration;
      const rangeTypeChanged = rangeType && rangeType !== localState.rangeType;

      if (rangeTypeChanged || colorRanges !== localState.colorRanges) {
        dispatch({
          type: 'set',
          payload: toLocalState(colorRanges, paletteConfiguration),
        });
      }
    }
  }, [colorRanges, paletteConfiguration?.rangeType]);

  useDebounce(
    () => {
      const { continuity: localContinuity, colorRanges: localColorRanges } = localState;
      const upperMin = ['below', 'all'].includes(localContinuity!)
        ? localColorRanges[0].start
        : -Infinity;

      const upperMax = ['above', 'all'].includes(localContinuity!)
        ? last(localColorRanges)!.end
        : Infinity;

      const colorStops = localColorRanges.map((colorRange, i) => ({
        color: colorRange.color,
        stop: i === 0 ? upperMin : colorRange.start,
      }));

      if (
        Object.values(validateColorRanges(localColorRanges)).every(({ isValid }) => isValid) &&
        localColorRanges !== colorRanges
      ) {
        onChange(colorStops, upperMax, localContinuity);
      }
    },
    250,
    [localState]
  );

  const lastColorRange = last(localState.colorRanges);

  return (
    <EuiFlexGroup
      data-test-subj={`dynamicColoring_custom_color_ranges`}
      direction="column"
      gutterSize="s"
    >
      {localState.colorRanges.map((colorRange, index) => (
        <EuiFlexItem grow={false}>
          <ColorRangeItem
            key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}
            colorRange={colorRange}
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            continuity={localState.continuity}
            rangeType={localState.rangeType}
            dataBounds={dataBounds}
            index={index}
            isValid={colorRangesValidity[index]?.isValid}
            accessor="start"
          />
        </EuiFlexItem>
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
          isValid={colorRangesValidity.last?.isValid}
          accessor="end"
        />
      ) : null}
      <EuiFlexItem grow={false}>
        {getErrorMessages(colorRangesValidity).map((error) => (
          <EuiTextColor color="danger">{error}</EuiTextColor>
        ))}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ColorRangesFooter
          dispatch={dispatch}
          colorRanges={localState.colorRanges}
          dataBounds={dataBounds}
          maxSteps={paletteConfiguration?.maxSteps}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
