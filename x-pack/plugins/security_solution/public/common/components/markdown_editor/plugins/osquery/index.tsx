/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { plugin } from './plugin';
import { OsqueryParser } from './parser';
import { OsqueryRenderer } from './renderer';

export { plugin, OsqueryParser as parser, OsqueryRenderer as renderer };
