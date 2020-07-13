/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './index.scss';
import { IndexMgmtUIPlugin, IndexManagementPluginSetup } from './plugin';

/** @public */
export const plugin = () => {
  return new IndexMgmtUIPlugin();
};

export { IndexManagementPluginSetup };

export { getIndexListUri } from './application/services/routing';
