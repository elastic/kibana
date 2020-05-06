/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from '../../../../../src/core/types';

export enum BackgroundSessionStatus {
  Running,
  Done,
  Error,
  Expired,
  Canceled,
}

export interface BackgroundSessionSavedObjectAttributes extends SavedObjectAttributes {
  sessionId: string;
  creation: string;
  expiration: string;
  idMapping: { [key: string]: string };
  status: BackgroundSessionStatus;
}

export const BACKGROUND_SESSION_STORE_DAYS = 5;
