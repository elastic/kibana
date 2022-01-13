/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, Dispatch } from 'react';

import { EuiFlexGroup, EuiTextColor, EuiFlexItem } from '@elastic/eui';

import { ColorRangesExtraActions } from './color_ranges_extra_actions';
import { ColorRangeItem } from './color_ranges_item';
import {
  validateColorRanges,
  getErrorMessages,
  ColorRangeValidation,
} from './color_ranges_validation';

import type { CustomPaletteParamsConfig } from '../../../../common';
import type { ColorRange, DataBounds } from './types';
import type { PaletteConfigurationActions } from '../types';

import { defaultPaletteParams } from '../constants';

export interface ColorRangesProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  dataBounds: DataBounds;
  showExtraActions?: boolean;
  dispatch: Dispatch<PaletteConfigurationActions>;
}

export function ColorRanges({
  colorRanges,
  dataBounds,
  paletteConfiguration,
  showExtraActions = true,
  dispatch,
}: ColorRangesProps) {
  const [colorRangesValidity, setColorRangesValidity] = useState<
    Record<string, ColorRangeValidation>
  >({});

  const lastColorRange = colorRanges[colorRanges.length - 1];
  const errors = getErrorMessages(colorRangesValidity);
  const continuity = paletteConfiguration?.continuity ?? defaultPaletteParams.continuity;
  const rangeType = paletteConfiguration?.rangeType ?? defaultPaletteParams.rangeType;

  useEffect(() => {
    setColorRangesValidity(
      validateColorRanges(colorRanges, dataBounds, rangeType)
    );
  }, [colorRanges, rangeType, dataBounds]);

  return (
    <EuiFlexGroup
      data-test-subj={`lnsPalettePanel_dynamicColoring_custom_color_ranges`}
      direction="column"
      gutterSize="s"
    >
      {colorRanges.map((colorRange, index) => (
        <EuiFlexItem grow={false} key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}>
          <ColorRangeItem
            colorRange={colorRange}
            dispatch={dispatch}
            colorRanges={colorRanges}
            continuity={continuity}
            rangeType={rangeType}
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
            colorRanges={colorRanges}
            continuity={continuity}
            rangeType={rangeType}
            dataBounds={dataBounds}
            index={colorRanges.length - 1}
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
                colorRanges.length >= paletteConfiguration?.maxSteps) ||
                errors.length
            )}
            shouldDisableDistribute={Boolean(colorRanges.length === 1)}
            shouldDisableReverse={Boolean(colorRanges.length === 1)}
            dataBounds={dataBounds}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
