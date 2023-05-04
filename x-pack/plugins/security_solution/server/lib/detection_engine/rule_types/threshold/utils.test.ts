/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateThresholdSignalUuid } from './utils';

describe('calculateThresholdSignalUuid', () => {
  it('should generate a uuid without key', () => {
    const startedAt = new Date('2020-12-17T16:27:00Z');
    const signalUuid = calculateThresholdSignalUuid('abcd', startedAt, ['agent.name']);
    expect(signalUuid).toEqual('a4832768-a379-583a-b1a2-e2ce2ad9e6e9');
  });

  it('should generate a uuid with key', () => {
    const startedAt = new Date('2019-11-18T13:32:00Z');
    const signalUuid = calculateThresholdSignalUuid('abcd', startedAt, ['host.ip'], '1.2.3.4');
    expect(signalUuid).toEqual('ee8870dc-45ff-5e6c-a2f9-80886651ce03');
  });
});
