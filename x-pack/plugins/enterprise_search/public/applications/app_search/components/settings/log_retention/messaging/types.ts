/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogRetentionSettings } from '../types';

export type TMessageStringOrFunction =
  | string
  | ((ilmEnabled: boolean, logRetentionSettings: LogRetentionSettings) => string);

export interface LogRetentionMessages {
  noLogging: TMessageStringOrFunction;
  ilmDisabled: TMessageStringOrFunction;
  customPolicy: TMessageStringOrFunction;
  defaultPolicy: TMessageStringOrFunction;
}
