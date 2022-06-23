/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiThemeVars } from '@kbn/ui-theme';
import { ActionButtonIcon } from '../../../../types';

const DEFAULT_ACTION_BUTTON_WIDTH: { [id: string]: number } = {
  s: 32,
};
export const MIN_ACTION_COLUMN_HEADER_WIDTH = 75;

/**
 * Returns the width of the Actions column based on the number of buttons being
 * displayed
 *
 * NOTE: This function is necessary because `width` is a required property of
 * the `EuiDataGridControlColumn` interface, so it must be calculated before
 * content is rendered. (The width of a `EuiDataGridControlColumn` does not
 * automatically size itself to fit all the content.)
 *
 * WARNING: It only works with EuiButtonIcon size 's'
 */
export const getActionsColumnWidth = (actionButtonCount: number): number => {
  const contentWidth = actionButtonCount * DEFAULT_ACTION_BUTTON_WIDTH.s;
  const leftRightCellPadding = parseInt(euiThemeVars.euiDataGridCellPaddingM, 10) * 2; // parseInt ignores the trailing `px`, e.g. `6px`
  const cellBorderSize = parseInt(euiThemeVars.euiBorderWidthThin, 10) * 2;
  const width = contentWidth + leftRightCellPadding + cellBorderSize;

  return width > MIN_ACTION_COLUMN_HEADER_WIDTH ? width : MIN_ACTION_COLUMN_HEADER_WIDTH;
};

export const getActionButtonCount = (
  actionsColumn: ActionButtonIcon[] | undefined,
  isExpandToDetailsShown: boolean
): number => {
  const registeredActionsLength = actionsColumn?.length ? actionsColumn.length : 0;
  return registeredActionsLength + (isExpandToDetailsShown ? 1 : 0);
};
