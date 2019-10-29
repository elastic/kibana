/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DEFAULT_SPACE_ID = `default`;

/**
 * The minimum number of spaces required to show a search control.
 */
export const SPACE_SEARCH_COUNT_THRESHOLD = 8;

/**
 * The maximum number of characters allowed in the Space Avatar's initials
 */
export const MAX_SPACE_INITIALS = 2;

/**
 * The type name used within the Monitoring index to publish spaces stats.
 * @type {string}
 */
export const KIBANA_SPACES_STATS_TYPE = 'spaces';

/**
 * The path to enter a space.
 */
export const ENTER_SPACE_PATH = '/spaces/enter';
