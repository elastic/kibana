/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/server';
import {
  counterRate,
  formatColumn,
  renameColumns,
  getTimeScale,
  getDatatable,
  lensMultitable,
} from '../../common/expressions';
import { getFormatFactory, getTimeZoneFactory } from './utils';

import type { PluginStartContract } from '../plugin';
import type { ExpressionsServerSetup } from '../../../../../src/plugins/expressions/server';

export const setupExpressions = (
  core: CoreSetup<PluginStartContract>,
  expressions: ExpressionsServerSetup
) => {
  [lensMultitable].forEach((expressionType) => expressions.registerType(expressionType));

  [
    counterRate,
    formatColumn,
    renameColumns,
    getDatatable(getFormatFactory(core)),
    getTimeScale(getTimeZoneFactory(core)),
  ].forEach((expressionFn) => expressions.registerFunction(expressionFn));
};
