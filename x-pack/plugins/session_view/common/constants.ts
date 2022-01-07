/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'sessionView';
export const PLUGIN_NAME = 'Session View';

export const BASE_PATH = '/app/sessionView';

// Internal APIs are recommended to have the INTERNAL- suffix
export const INTERNAL_TEST_ROUTE = '/internal/session_view/test_route';
export const INTERNAL_TEST_SAVED_OBJECT_ROUTE = '/internal/session_view/test_saved_object_route';
export const PROCESS_EVENTS_ROUTE = '/internal/session_view/process_events_route';
export const RECENT_SESSION_ROUTE = '/internal/session_view/recent_session_route';
export const SESSION_ENTRY_LEADERS_ROUTE = '/internal/session_view/session_entry_leaders_route';
export const TEST_SAVED_OBJECT = 'session_view_test_saved_object';

export const PROCESS_EVENTS_PER_PAGE = 1000;
