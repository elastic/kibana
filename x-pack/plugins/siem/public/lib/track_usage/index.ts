/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { trackUiMetric } from '../../../../../../src/legacy/core_plugins/ui_metric/public';
import { APP_ID } from '../../../common/constants';

export const trackUiAction = (metricType: string) => trackUiMetric(APP_ID, metricType);
