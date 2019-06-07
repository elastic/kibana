/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CANVAS_TYPE = 'canvas-workpad';
export const CUSTOM_ELEMENT_TYPE = 'canvas-element';
export const CANVAS_APP = 'canvas';
export const APP_ROUTE = '/app/canvas';
export const APP_ROUTE_WORKPAD = `${APP_ROUTE}#/workpad`;
export const API_ROUTE = '/api/canvas';
export const API_ROUTE_WORKPAD = `${API_ROUTE}/workpad`;
export const API_ROUTE_WORKPAD_ASSETS = `${API_ROUTE}/workpad-assets`;
export const API_ROUTE_WORKPAD_STRUCTURES = `${API_ROUTE}/workpad-structures`;
export const API_ROUTE_CUSTOM_ELEMENT = `${API_ROUTE}/custom-element`;
export const LOCALSTORAGE_PREFIX = `kibana.canvas`;
export const LOCALSTORAGE_CLIPBOARD = `${LOCALSTORAGE_PREFIX}.clipboard`;
export const LOCALSTORAGE_AUTOCOMPLETE_ENABLED = `${LOCALSTORAGE_PREFIX}.isAutocompleteEnabled`;
export const LOCALSTORAGE_EXPRESSION_EDITOR_FONT_SIZE = `${LOCALSTORAGE_PREFIX}.expressionEditorFontSize`;
export const LOCALSTORAGE_LASTPAGE = 'canvas:lastpage';
export const FETCH_TIMEOUT = 30000; // 30 seconds
export const CANVAS_USAGE_TYPE = 'canvas';
export const DEFAULT_WORKPAD_CSS = '.canvasPage {\n\n}';
export const VALID_IMAGE_TYPES = ['gif', 'jpeg', 'png', 'svg+xml'];
export const ASSET_MAX_SIZE = 25000;
