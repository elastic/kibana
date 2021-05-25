/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The minimum (fixed) width of the Actions column */
export const MINIMUM_ACTIONS_COLUMN_WIDTH = 50; // px;

/** Additional column width to include when checkboxes are shown **/
export const SHOW_CHECK_BOXES_COLUMN_WIDTH = 24; // px;

/** The (fixed) width of the Actions column */
export const DEFAULT_ACTIONS_COLUMN_WIDTH = SHOW_CHECK_BOXES_COLUMN_WIDTH * 5; // px;
/**
 * The (fixed) width of the Actions column when the timeline body is used as
 * an events viewer, which has fewer actions than a regular events viewer
 */
export const EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH = SHOW_CHECK_BOXES_COLUMN_WIDTH * 4; // px;

/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px

/** The minimum width of a resized column */
export const RESIZED_COLUMN_MIN_WITH = 70; // px

/** The default minimum width of a column of type `date` */
export const DEFAULT_DATE_COLUMN_MIN_WIDTH = 190; // px
