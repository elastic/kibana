/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUiMetricUri } from '../../../../common/ui_metric';
import { UA_APP_NAME } from '../../common/constants';
import { getHttpClient } from './api';

export function trackUserAction(actionType) {
  const uiMetricUri = createUiMetricUri(UA_APP_NAME, actionType);
  getHttpClient().post(uiMetricUri);
}
