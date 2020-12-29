/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ACTION, STATUS } from './constants';

export interface UISession {
  id: string;
  name: string;
  appId: string;
  created: string;
  expires: string | null;
  status: STATUS;
  actions?: ACTION[];
  isViewable: boolean;
  expiresSoon: boolean;
  url: string;
}

export type ActionComplete = (result: UISession[] | null) => void;

export * from './constants';
