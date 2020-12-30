/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * The max nested depth allowed for child fields.
 * Above this thresold, the user has to use the JSON editor.
 */
export const MAX_DEPTH_DEFAULT_EDITOR = 4;

/**
 * 16px is the default $euiSize Sass variable.
 * @link https://elastic.github.io/eui/#/guidelines/sass
 */
export const EUI_SIZE = 16;

export const CHILD_FIELD_INDENT_SIZE = EUI_SIZE * 1.5;

export const LEFT_PADDING_SIZE_FIELD_ITEM_WRAPPER = EUI_SIZE * 0.25;
