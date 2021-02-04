/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
