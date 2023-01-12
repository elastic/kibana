/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * PLUGIN_ID is used as a unique identifier for the aiops plugin
 */
export const PLUGIN_ID = 'aiops';

/**
 * PLUGIN_NAME is used as the display name for the aiops plugin
 */
export const PLUGIN_NAME = 'AIOps';

/**
 * This is an internal hard coded feature flag so we can easily turn on/off the
 * "Explain log rate spikes UI" during development until the first release.
 */
export const AIOPS_ENABLED = true;

export const CHANGE_POINT_DETECTION_ENABLED = true;
