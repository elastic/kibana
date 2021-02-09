/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as home from './home';
import * as workpad from './workpad';
import * as exp from './export';

// @ts-expect-error Router and routes are not yet strongly typed
export const routes = [].concat(workpad.routes, home.routes, exp.routes);

export const apps = [workpad.WorkpadApp, home.HomeApp, exp.ExportApp];
