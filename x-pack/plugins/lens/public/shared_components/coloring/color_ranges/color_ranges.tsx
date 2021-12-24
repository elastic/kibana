/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useReducer } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { EuiFlexGroup, EuiTextColor, EuiFlexItem } from '@elastic/eui';

import { ColorRangesExtraActions } from './color_ranges_extra_actions';
import { ColorRangeItem } from './color_ranges_item';
import { colorRangesReducer } from './color_ranges_reducer';
import {
  validateColorRanges,
  getErrorMessages,
  ColorRangeValidation,
} from './color_ranges_validation';
import { toColorStops } from './utils';

import type { CustomPaletteParamsConfig, ColorStop } from '../../../../common';
import type { ColorRange, DataBounds, ColorRangesState } from './types';
import type { PaletteContinuity } from '../../../../../../../src/plugins/charts/common';

import { defaultPaletteParams } from '../constants';

export interface ColorRangesProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  onChange: (colorStops: ColorStop[], upperMax: number, continuity: PaletteContinuity) => void;
  dataBounds: DataBounds;
  showExtraActions?: boolean;
}

const toLocalState = (
  colorRanges: ColorRangesProps['colorRanges'],
  paletteConfiguration: ColorRangesProps['paletteConfiguration']
): ColorRangesState => ({
  colorRanges,
  rangeType: paletteConfiguration?.rangeType ?? defaultPaletteParams.rangeType,
  continuity: paletteConfiguration?.continuity ?? defaultPaletteParams.continuity,
});

export function ColorRanges({
  colorRanges,
  onChange,
  dataBounds,
  paletteConfiguration,
  showExtraActions = true,
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

      if (
        Object.values(validateColorRanges(localColorRanges)).every(({ isValid }) => isValid) &&
        localColorRanges !== colorRanges
      ) {
        const { max, colorStops } = toColorStops(localColorRanges, localContinuity);

        onChange(colorStops, max, localContinuity);
      }
    },
    250,
    [localState]
  );

  const lastColorRange = localState.colorRanges[localState.colorRanges.length - 1];

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
      {showExtraActions ? (
        <EuiFlexItem grow={false}>
          <ColorRangesExtraActions
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            dataBounds={dataBounds}
            maxSteps={paletteConfiguration?.maxSteps}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
