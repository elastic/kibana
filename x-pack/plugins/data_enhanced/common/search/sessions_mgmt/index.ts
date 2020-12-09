/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackgroundSessionSavedObjectAttributes } from '../';
import { ACTION, STATUS } from './constants';

export interface Session {
  id: string;
  name: string;
  appId: string;
  created: string;
  expires: string | null;
  status: STATUS;
  actions?: ACTION[];
  isViewable: boolean;
  expiresSoon: boolean;
  urlGeneratorId: BackgroundSessionSavedObjectAttributes['urlGeneratorId'];
  restoreState: BackgroundSessionSavedObjectAttributes['restoreState'];
}

export interface UISession extends Omit<Session, 'restoreState' | 'urlGeneratorId'> {
  url: string;
}

export interface ISession {
  session: string;
}

export type ActionComplete = (result: UISession[] | null) => void;

export * from './constants';
