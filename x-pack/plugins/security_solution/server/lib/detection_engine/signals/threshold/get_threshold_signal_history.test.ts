/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPreviousThresholdAlertRequest } from './get_threshold_signal_history';

describe('buildPreviousThresholdAlertRequest', () => {
  it('should generate a proper request when bucketByFields is empty', async () => {
    const bucketByFields: string[] = [];
    const to = 'now';
    const from = 'now-6m';
    const ruleId = 'threshold-rule';

    expect(
      buildPreviousThresholdAlertRequest({ from, to, ruleId, bucketByFields })
    ).toMatchSnapshot();
  });

  it('should generate a proper request when bucketByFields contains multiple fields', async () => {
    const bucketByFields: string[] = ['host.name', 'user.name'];
    const to = 'now';
    const from = 'now-6m';
    const ruleId = 'threshold-rule';

    expect(
      buildPreviousThresholdAlertRequest({ from, to, ruleId, bucketByFields })
    ).toMatchSnapshot();
  });
});
