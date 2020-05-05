/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../app/services/track_ui_metric', () => ({
  ...jest.requireActual('../../../app/services/track_ui_metric'),
  trackUiMetric: jest.fn(),
  trackUserRequest: (request: Promise<any>) => {
    return request.then(response => response);
  },
}));
