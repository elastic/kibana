/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ADDON_ID = 'kbn-canvas/redux-actions';
export const ACTIONS_PANEL_ID = `${ADDON_ID}/panel`;

const RESULT = `${ADDON_ID}/result`;
const REQUEST = `${ADDON_ID}/request`;
const ACTION = `${ADDON_ID}/action`;
const RESET = `${ADDON_ID}/reset`;

export const EVENTS = { ACTION, RESULT, REQUEST, RESET };
