/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './index.scss';
import { IndexMgmtUIPlugin, IndexMgmtSetup } from './plugin';

/** @public */
export { IndexMgmtSetup };

export const plugin = () => {
  return new IndexMgmtUIPlugin();
};

export { getIndexListUri } from './application/services/navigation';
