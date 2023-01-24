/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These hooks are tightly coupled to each tab of the Fleet server instructions component, and provide
// all necessary data to drive those UI's
export * from './use_advanced_form';
export * from './use_quick_start_form';

// These are individual hooks for one-off consumption. These are typically composed in the hooks above,
// but exported here to support individual usage.
export * from './use_wait_for_fleet_server';
export * from './use_select_fleet_server_policy';
export * from './use_service_token';
export * from './use_fleet_server_host';
