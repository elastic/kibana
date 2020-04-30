/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMlIndex, getMlJobId, getMlPrefix } from './ml_job_constants';

describe('ml_job_constants', () => {
  it('getMlPrefix', () => {
    expect(getMlPrefix('myServiceName')).toBe('myservicename-');
    expect(getMlPrefix('myServiceName', 'myTransactionType')).toBe(
      'myservicename-mytransactiontype-'
    );
  });

  it('getMlJobId', () => {
    expect(getMlJobId('myServiceName')).toBe(
      'myservicename-high_mean_response_time'
    );
    expect(getMlJobId('myServiceName', 'myTransactionType')).toBe(
      'myservicename-mytransactiontype-high_mean_response_time'
    );
    expect(getMlJobId('my service name')).toBe(
      'my_service_name-high_mean_response_time'
    );
    expect(getMlJobId('my service name', 'my transaction type')).toBe(
      'my_service_name-my_transaction_type-high_mean_response_time'
    );
  });

  it('getMlIndex', () => {
    expect(getMlIndex('myServiceName')).toBe(
      '.ml-anomalies-myservicename-high_mean_response_time'
    );

    expect(getMlIndex('myServiceName', 'myTransactionType')).toBe(
      '.ml-anomalies-myservicename-mytransactiontype-high_mean_response_time'
    );
  });
});
