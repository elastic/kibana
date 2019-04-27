/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetch } from '../../common/lib/fetch';
import { createUiMetricUri } from '../../../../common/ui_metric';

const APP = 'canvas';

export const trackUiMetric = (uiMetric: string): void => {
  const uri = createUiMetricUri(APP, uiMetric);
  return fetch.post(uri);
};
