/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useReducer } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { last } from 'lodash';

import { EuiFlexGroup, EuiTextColor, EuiFlexItem, EuiFormRow } from '@elastic/eui';

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

const getErrorMessage = (
  colorRangesValidity: Record<string, ColorRangeValidation>
): string | undefined => {
  const firstError = Object.values(colorRangesValidity).find((item) => !item.isValid);

  if (firstError) {
    switch (firstError.errors[0]) {
      case 'invalidColor':
      case 'invalidValue':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidValueOrColor', {
          defaultMessage: 'At least one color range contains the wrong value or color',
        });
      case 'greaterThanMaxValue':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidMaxValue', {
          defaultMessage: 'Maximum value should be greater than preceding values',
        });
    }
  }
  return undefined;
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

  useEffect(() => {
    if (paletteConfiguration) {
      const { rangeType } = paletteConfiguration;
      const rangeTypeChanged = rangeType && rangeType !== localState.rangeType;

      if (rangeTypeChanged) {
        dispatch({
          type: 'set',
          payload: toLocalState(colorRanges, paletteConfiguration),
        });
      }
    }
  }, [colorRanges, localState, paletteConfiguration]);

  useDebounce(
    () => {
      const { continuity: localContinuity, colorRanges: localColorRanges } = localState;
      const upperMin = ['below', 'all'].includes(localContinuity!)
        ? -Infinity
        : Number(localColorRanges[0].start);

      const upperMax = ['above', 'all'].includes(localContinuity!)
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
  const error = getErrorMessage(colorRangesValidity);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.dynamicColoring.customPalette.colorRangesLabel', {
        defaultMessage: 'Color Ranges',
      })}
      display="rowCompressed"
    >
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
          {error ? <EuiTextColor color="danger">{error}</EuiTextColor> : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ColorRangesFooter
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            dataBounds={dataBounds}
            paletteConfiguration={paletteConfiguration}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
