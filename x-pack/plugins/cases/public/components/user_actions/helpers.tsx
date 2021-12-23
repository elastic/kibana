/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPPORTED_ACTION_TYPES } from './constants';
import { SupportedUserActionTypes } from './types';

export const isUserActionTypeSupported = (type: unknown): type is SupportedUserActionTypes =>
  SUPPORTED_ACTION_TYPES.includes(type as SupportedUserActionTypes);
