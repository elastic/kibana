/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { AlertData } from '../../../../../endpoint_app_types';
import { AlertListState } from './types';

export const alertListData = (state: AlertListState) => state.alerts;
