/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAsyncAction } from './utils';
import { StatesIndexStatus } from '../../../common/runtime_types';

export const indexStatusAction = createAsyncAction<any, StatesIndexStatus>('GET INDEX STATUS');
