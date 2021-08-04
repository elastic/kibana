/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdown } from './markdown';
import { pie } from './pie';
import { plot } from './plot';
import { text } from './text';
import { table } from './table';

export const renderFunctions = [markdown, pie, plot, table, text];

export const renderFunctionFactories = [];
