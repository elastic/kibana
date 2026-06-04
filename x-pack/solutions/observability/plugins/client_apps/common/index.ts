/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'clientApps';

export const ANDROID_RETRACE_API_PATH = '/internal/client_apps/android/retrace';

/** Fetches an Android crash document from Elasticsearch by _id. */
export const ANDROID_CRASH_DOCUMENT_API_PATH = '/internal/client_apps/android/crash_document';

export const DEFAULT_CRASH_INDEX = 'logs-generic.otel*';
