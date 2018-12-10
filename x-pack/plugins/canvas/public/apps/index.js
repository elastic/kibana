/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as home from './home';
import * as workpad from './workpad';
import * as exp from './export';

export const routes = [].concat(workpad.routes, home.routes, exp.routes);

export const apps = [workpad.WorkpadApp, home.HomeApp, exp.ExportApp];
