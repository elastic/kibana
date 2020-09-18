/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMLJobId } from '../ml';

describe('ML Anomaly API', () => {
  it('it generates a lowercase job id', async () => {
    const monitorId = 'ABC1334haa';

    const jobId = getMLJobId(monitorId);

    expect(jobId).toEqual(jobId.toLowerCase());
  });

  it('should truncate long monitor IDs', () => {
    const longAndWeirdMonitorId =
      'https://auto-mmmmxhhhhhccclongAndWeirdMonitorId123yyyyyrereauto-xcmpa-1345555454646';

    expect(getMLJobId(longAndWeirdMonitorId)).toHaveLength(64);
  });

  it('should remove special characters and replace them with underscore', () => {
    const monIdSpecialChars = '/ ? , " < > | *   a';

    const jobId = getMLJobId(monIdSpecialChars);

    const format = /[/?,"<>|*]+/;

    expect(format.test(jobId)).toBe(false);
  });
});
