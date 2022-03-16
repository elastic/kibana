/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

/**
 * This is the effective width in pixels of an action button used with
 * `EuiDataGrid` `leadingControlColumns`. (See Notes below for details)
 *
 * Notes:
 * 1) This constant is necessary because `width` is a required property of
 *    the `EuiDataGridControlColumn` interface, so it must be calculated before
 *    content is rendered. (The width of a `EuiDataGridControlColumn` does not
 *    automatically size itself to fit all the content.)
 *
 * 2) This is the *effective* width, because at the time of this writing,
 *    `EuiButtonIcon` has a `margin-left: -4px`, which is subtracted from the
 *    `width`
 */
export const DEFAULT_ACTION_BUTTON_WIDTH =
  parseInt(euiThemeVars.euiSizeXL, 10) - parseInt(euiThemeVars.euiSizeXS, 10); // px

/** Additional column width to include when checkboxes are shown **/
export const SHOW_CHECK_BOXES_COLUMN_WIDTH = 24; // px;

/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px

/** The minimum width of a resized column */
export const RESIZED_COLUMN_MIN_WITH = 70; // px

/** The default minimum width of a column of type `date` */
export const DEFAULT_DATE_COLUMN_MIN_WIDTH = 190; // px
