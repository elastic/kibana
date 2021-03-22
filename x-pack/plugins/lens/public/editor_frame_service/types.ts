/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions';

export type TableInspectorAdapter = Record<string, Datatable>;

export interface ErrorMessage {
  shortMessage: string;
  longMessage: string;
  type?: 'fixable' | 'critical';
}
