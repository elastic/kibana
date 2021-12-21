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
import { isLastItem } from './utils';

import type { DataBounds, ColorRangesActions, ColorRange, ColorRangeAccessor } from './types';
import type { CustomPaletteParams } from '../../../../common';

export interface ColorRangesItemButtonProps {
  index: number;
  colorRanges: ColorRange[];
  rangeType: CustomPaletteParams['rangeType'];
  continuity: CustomPaletteParams['continuity'];
  dataBounds: DataBounds;
  dispatch: Dispatch<ColorRangesActions>;
  accessor: ColorRangeAccessor;
}

export function ColorRangeDeleteButton({
  index,
  dispatch,
  colorRanges,
}: ColorRangesItemButtonProps) {
  const onExecuteAction = useCallback(() => {
    dispatch({ type: 'deleteColorRange', payload: { index } });
  }, [dispatch, index]);

  const title = i18n.translate('xpack.lens.dynamicColoring.customPalette.deleteButtonAriaLabel', {
    defaultMessage: 'Delete',
  });

  return (
    <EuiButtonIcon
      iconType="trash"
      color="danger"
      aria-label={title}
      title={title}
      onClick={onExecuteAction}
      data-test-subj={`dynamicColoring_removeColorRange_${index}`}
    />
  );
}

export function ColorRangeEditButton({
  index,
  dataBounds,
  colorRanges,
  rangeType,
  continuity,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const isLast = isLastItem(accessor);

  const onExecuteAction = useCallback(() => {
    const { max } = getDataMinMax(rangeType, dataBounds);
    let newValue;
    let newContinuity: CustomPaletteParams['continuity'];

    const colorStops = colorRanges.map(({ color, start }) => ({
      color,
      stop: Number(start),
    }));
    const step = roundValue(getStepValue(colorStops, colorStops, max));

    if (isLast) {
      newValue = colorRanges[index].start + step;
      newContinuity = continuity === 'all' ? 'below' : 'none';
    } else {
      newValue = colorRanges[index].end - step;
      newContinuity = continuity === 'all' ? 'above' : 'none';
    }

    colorRanges[index][isLast ? 'end' : 'start'] = roundValue(newValue);

    dispatch({
      type: 'set',
      payload: { colorRanges: [...colorRanges], continuity: newContinuity },
    });
  }, [rangeType, dataBounds, colorRanges, isLast, index, dispatch, continuity]);

  const title = i18n.translate('xpack.lens.dynamicColoring.customPalette.editButtonAriaLabel', {
    defaultMessage: 'Edit',
  });

  return (
    <EuiButtonIcon
      iconType="pencil"
      aria-label={title}
      title={title}
      onClick={onExecuteAction}
      data-test-subj={`dynamicColoring_editValue_${index}`}
    />
  );
}

export function ColorRangeAutoDetectButton({
  index,
  dataBounds,
  colorRanges,
  rangeType,
  continuity,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const isLast = isLastItem(accessor);

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
    let newContinuity: CustomPaletteParams['continuity'];

    if (isLast) {
      newContinuity = continuity === 'none' ? 'above' : 'all';
    } else {
      newContinuity = continuity === 'none' ? 'below' : 'all';
    }

    colorRanges[index][isLast ? 'end' : 'start'] = newValue;

    dispatch({
      type: 'set',
      payload: { colorRanges: [...colorRanges], continuity: newContinuity },
    });
  }, [continuity, colorRanges, dataBounds, dispatch, index, isLast, rangeType]);

  const title = isLast
    ? i18n.translate('xpack.lens.dynamicColoring.customPalette.autoDetectMaximumAriaLabel', {
        defaultMessage: 'Auto detect maximum value',
      })
    : i18n.translate('xpack.lens.dynamicColoring.customPalette.autoDetectMinimumAriaLabel', {
        defaultMessage: 'Auto detect minimum value',
      });

  return (
    <EuiButtonIcon
      iconType={isLast ? ValueMaxIcon : ValueMinIcon}
      aria-label={title}
      title={title}
      onClick={onExecuteAction}
      data-test-subj={`dynamicColoring_autoDetect_${isLast ? 'maximum' : 'minimum'}`}
    />
  );
}
