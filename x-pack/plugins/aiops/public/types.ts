/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsPlugin } from './plugin';

/**
 * aiops plugin public setup contract
 */
export type AiopsPluginSetup = ReturnType<AiopsPlugin['setup']>;

/**
 * aiops plugin public start contract
 */
export type AiopsPluginStart = ReturnType<AiopsPlugin['start']>;

// eslint-disable-next-line
export type AppPluginStartDependencies = {};
