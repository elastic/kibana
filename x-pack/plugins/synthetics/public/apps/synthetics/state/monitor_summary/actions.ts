/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ping } from '../../../../../common/runtime_types';
import { QueryParams } from './api';
import { createAsyncAction } from '../utils/actions';

export const getMonitorStatusAction = createAsyncAction<QueryParams, Ping>('[MONITOR STATUS] GET');
