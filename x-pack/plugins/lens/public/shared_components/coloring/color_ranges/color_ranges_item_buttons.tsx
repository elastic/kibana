/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonIcon } from '@elastic/eui';

import { ValueMaxIcon } from '../../../assets/value_max';
import { ValueMinIcon } from '../../../assets/value_min';
import { getAutoValues, getDataMinMax, getStepValue, roundValue } from '../utils';

import type { CustomPaletteParamsConfig } from '../../../../common';
import type { DataBounds, AutoValueMode, ColorRangesActions, ColorRange } from './types';

export interface ColorRangesItemButtonProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  dataBounds: DataBounds;
  dispatch: Dispatch<ColorRangesActions>;
  index: number;
  accessor: 'start' | 'end';
}

export function ColorRangeDeleteButton({
  index,
  dispatch,
  colorRanges,
}: ColorRangesItemButtonProps) {
  const onExecuteAction = useCallback(() => {
    dispatch({ type: 'deleteColorRange', payload: { index } });
  }, [dispatch, index]);

  return (
    <EuiButtonIcon
      iconType="trash"
      color="danger"
      aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.deleteButtonAriaLabel', {
        defaultMessage: 'Delete',
      })}
      title={i18n.translate('xpack.lens.dynamicColoring.customPalette.deleteButtonLabel', {
        defaultMessage: 'Delete',
      })}
      onClick={onExecuteAction}
      disabled={colorRanges.length === 2}
      data-test-subj={`dynamicColoring_removeColorRange_${index}`}
    />
  );
}

export function ColorRangeEditButton({
  index,
  dataBounds,
  colorRanges,
  paletteConfiguration,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const rangeType = paletteConfiguration?.rangeType ?? 'percent';
  const autoValue = paletteConfiguration?.autoValue ?? 'none';
  const isLast = accessor === 'end';

  const onExecuteAction = useCallback(() => {
    const { max } = getDataMinMax(rangeType, dataBounds);
    let newValue;
    let newAutoValue: AutoValueMode;

    const colorStops = colorRanges.map(({ color, start }) => ({
      color,
      stop: Number(start),
    }));
    const step = roundValue(getStepValue(colorStops, colorStops, max));

    if (isLast) {
      newValue = colorRanges[index].start + step;
      newAutoValue = autoValue === 'all' ? 'min' : 'none';
    } else {
      newValue = colorRanges[index].end - step;
      newAutoValue = autoValue === 'all' ? 'max' : 'none';
    }

    colorRanges[index][isLast ? 'end' : 'start'] = roundValue(newValue);

    dispatch({ type: 'set', payload: { colorRanges: [...colorRanges], autoValue: newAutoValue } });
  }, [rangeType, dataBounds, colorRanges, isLast, index, dispatch, autoValue]);

  return (
    <EuiButtonIcon
      iconType="pencil"
      aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.editButtonAriaLabel', {
        defaultMessage: 'Edit',
      })}
      title={i18n.translate('xpack.lens.dynamicColoring.customPalette.editButtonLabel', {
        defaultMessage: 'Edit',
      })}
      onClick={onExecuteAction}
      data-test-subj={`dynamicColoring_editValue_${index}`}
    />
  );
}

export function ColorRangeAutoDetectButton({
  index,
  dataBounds,
  colorRanges,
  paletteConfiguration,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const rangeType = paletteConfiguration?.rangeType ?? 'percent';
  const autoValue = paletteConfiguration?.autoValue ?? 'none';
  const isLast = accessor === 'end';

  const onExecuteAction = useCallback(() => {
    const { max: autoMax, min: autoMin } = getAutoValues(
      {
        first: colorRanges[1].start,
        preLast: colorRanges[colorRanges.length - 2].start,
        last: colorRanges[colorRanges.length - 1].start,
      },
      rangeType,
      dataBounds
    );
    const newValue = roundValue(isLast ? autoMax : autoMin);
    let newAutoValue: AutoValueMode;

    if (isLast) {
      newAutoValue = autoValue === 'none' ? 'max' : 'all';
    } else {
      newAutoValue = autoValue === 'none' ? 'min' : 'all';
    }

    colorRanges[index][isLast ? 'end' : 'start'] = newValue;

    dispatch({ type: 'set', payload: { colorRanges: [...colorRanges], autoValue: newAutoValue } });
  }, [autoValue, colorRanges, dataBounds, dispatch, index, isLast, rangeType]);

  return (
    <EuiButtonIcon
      iconType={isLast ? ValueMaxIcon : ValueMinIcon}
      aria-label={
        isLast
          ? i18n.translate('xpack.lens.dynamicColoring.customPalette.autoDetectMaximumAriaLabel', {
              defaultMessage: 'Auto detect maximum value',
            })
          : i18n.translate('xpack.lens.dynamicColoring.customPalette.autoDetectMinimumAriaLabel', {
              defaultMessage: 'Auto detect minimum value',
            })
      }
      title={
        isLast
          ? i18n.translate('xpack.lens.dynamicColoring.customPalette.autoDetectMaximumLabel', {
              defaultMessage: 'Auto detect maximum value',
            })
          : i18n.translate('xpack.lens.dynamicColoring.customPalette.autoDetectMinimumLabel', {
              defaultMessage: 'Auto detect minimum value',
            })
      }
      onClick={onExecuteAction}
      data-test-subj={`dynamicColoring_autoDetect_${isLast ? 'maximum' : 'minimum'}`}
    />
  );
}
