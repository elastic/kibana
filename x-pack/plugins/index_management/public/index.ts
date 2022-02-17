/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './index.scss';
import { PluginInitializerContext } from 'src/core/public';
import { IndexMgmtUIPlugin } from './plugin';

/** @public */
export const plugin = (ctx: PluginInitializerContext) => {
  return new IndexMgmtUIPlugin(ctx);
};

export type { IndexManagementPluginSetup } from './types';

export { getIndexListUri, getTemplateDetailsLink } from './application/services/routing';

export type { Index } from '../common';
