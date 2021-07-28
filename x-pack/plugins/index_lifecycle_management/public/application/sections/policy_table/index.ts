/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyFromES } from '../../../../common/types';

export { PolicyTable } from './policy_table.container';

export type TableColumn = Extract<
  keyof PolicyFromES,
  'version' | 'name' | 'indices' | 'modifiedDate'
>;
