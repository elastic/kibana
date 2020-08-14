/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ORG_SOURCES_PATH = '/org/sources';
export const USERS_PATH = '/org/users';
export const ORG_SETTINGS_PATH = '/org/settings';
export const SETUP_GUIDE_PATH = '/setup_guide';

export const getSourcePath = (sourceId: string): string => `${ORG_SOURCES_PATH}/${sourceId}`;
