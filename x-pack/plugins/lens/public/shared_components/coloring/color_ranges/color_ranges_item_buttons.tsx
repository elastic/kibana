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
import { getDataMinMax, roundValue } from '../utils';
import { isLastItem } from './utils';

import type { DataBounds, ColorRangesActions, ColorRange, ColorRangeAccessor } from './types';
import type { CustomPaletteParams } from '../../../../common';
import type { PaletteContinuity } from '../../../../../../../src/plugins/charts/common';

export interface ColorRangesItemButtonProps {
  index: number;
  colorRanges: ColorRange[];
  rangeType: CustomPaletteParams['rangeType'];
  continuity: PaletteContinuity;
  dataBounds: DataBounds;
  dispatch: Dispatch<ColorRangesActions>;
  accessor: ColorRangeAccessor;
}

const switchContinuity = (isLast: boolean, continuity: PaletteContinuity) => {
  switch (continuity) {
    case 'none':
      return isLast ? 'above' : 'below';
    case 'above':
      return isLast ? 'none' : 'all';
    case 'below':
      return isLast ? 'all' : 'none';
    case 'all':
      return isLast ? 'below' : 'above';
  }
};

export function ColorRangeDeleteButton({ index, dispatch }: ColorRangesItemButtonProps) {
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
      data-test-subj={`lnsPalettePanel_dynamicColoring_removeColorRange_${index}`}
    />
  );
}

export function ColorRangeEditButton({
  index,
  colorRanges,
  rangeType,
  dataBounds,
  continuity,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const isLast = isLastItem(accessor);

  const onExecuteAction = useCallback(() => {
    const newContinuity = switchContinuity(isLast, continuity);

    dispatch({
      type: 'updateContinuity',
      payload: { isLast, continuity: newContinuity, dataBounds },
    });
  }, [colorRanges, isLast, index, dispatch, continuity, dataBounds, rangeType]);

  const title = i18n.translate('xpack.lens.dynamicColoring.customPalette.editButtonAriaLabel', {
    defaultMessage: 'Edit',
  });

  return (
    <EuiButtonIcon
      iconType="pencil"
      aria-label={title}
      title={title}
      onClick={onExecuteAction}
      data-test-subj={`lnsPalettePanel_dynamicColoring_editValue_${index}`}
    />
  );
}

export function ColorRangeAutoDetectButton({
  index,
  colorRanges,
  continuity,
  dataBounds,
  dispatch,
  accessor,
}: ColorRangesItemButtonProps) {
  const isLast = isLastItem(accessor);

  const onExecuteAction = useCallback(() => {
    const newContinuity = switchContinuity(isLast, continuity);

    dispatch({
      type: 'updateContinuity',
      payload: { isLast, continuity: newContinuity, dataBounds },
    });
  }, [continuity, colorRanges, dispatch, index, isLast]);

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
      data-test-subj={`lnsPalettePanel_dynamicColoring_autoDetect_${
        isLast ? 'maximum' : 'minimum'
      }`}
    />
  );
}
