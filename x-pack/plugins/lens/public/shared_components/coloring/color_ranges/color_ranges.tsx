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
    setColorRangesValidity(
      validateColorRanges(localState.colorRanges, dataBounds, localState.rangeType)
    );
  }, [localState.colorRanges, localState.rangeType, dataBounds]);

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
      const {
        continuity: localContinuity,
        colorRanges: localColorRanges,
        rangeType: localRangeType,
      } = localState;

      if (
        Object.values(validateColorRanges(localColorRanges, dataBounds, localRangeType)).every(
          ({ isValid }) => isValid
        ) &&
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
  const errors = getErrorMessages(colorRangesValidity);

  return (
    <EuiFlexGroup
      data-test-subj={`lnsPalettePanel_dynamicColoring_custom_color_ranges`}
      direction="column"
      gutterSize="s"
    >
      {localState.colorRanges.map((colorRange, index) => (
        <EuiFlexItem grow={false} key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}>
          <ColorRangeItem
            colorRange={colorRange}
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            continuity={localState.continuity}
            rangeType={localState.rangeType}
            dataBounds={dataBounds}
            index={index}
            validation={colorRangesValidity[index]}
            accessor="start"
          />
        </EuiFlexItem>
      ))}
      {lastColorRange ? (
        <EuiFlexItem grow={false}>
          <ColorRangeItem
            colorRange={lastColorRange}
            dispatch={dispatch}
            colorRanges={localState.colorRanges}
            continuity={localState.continuity}
            rangeType={localState.rangeType}
            dataBounds={dataBounds}
            index={localState.colorRanges.length - 1}
            validation={colorRangesValidity.last}
            accessor="end"
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        {errors.map((error) => (
          <EuiTextColor color="danger">{error}</EuiTextColor>
        ))}
      </EuiFlexItem>
      {showExtraActions ? (
        <EuiFlexItem grow={false}>
          <ColorRangesExtraActions
            dispatch={dispatch}
            shouldDisableAdd={Boolean(
              (paletteConfiguration?.maxSteps &&
                localState.colorRanges.length >= paletteConfiguration?.maxSteps) ||
                errors.length
            )}
            shouldDisableDistribute={Boolean(localState.colorRanges.length === 1)}
            shouldDisableReverse={Boolean(localState.colorRanges.length === 1)}
            dataBounds={dataBounds}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
