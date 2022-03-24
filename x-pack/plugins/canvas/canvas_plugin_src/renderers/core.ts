/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownFactory } from './markdown';
import { pie } from './pie';
import { plot } from './plot';
import { textFactory } from './text';
import { tableFactory } from './table';

export const renderFunctions = [pie, plot];

export const renderFunctionFactories = [markdownFactory, tableFactory, textFactory];
