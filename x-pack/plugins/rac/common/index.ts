/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'rac';
export const PLUGIN_NAME = 'Rules, Alerts, Cases';

export const APP_ICON = 'logoElasticStack';
export const APP_ICON_SOLUTION = 'logoElasticStack';
export const APP_PATH = `/app/rac`;

export enum RacPageName {
  rules = 'rules',
  alerts = 'alerts',
  cases = 'cases',
}

export const APP_RULES_PATH = `${APP_PATH}/rules`;
export const APP_ALERTS_PATH = `${APP_PATH}/alerts`;
export const APP_CASES_PATH = `${APP_PATH}/cases`;
