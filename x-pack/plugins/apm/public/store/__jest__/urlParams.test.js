/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reducer, { updateTimePicker } from '../urlParams';
import { LOCATION_UPDATE } from '../location';

describe('urlParams', () => {
  it('should handle LOCATION_UPDATE for transactions section', () => {
    const state = reducer(
      {},
      {
        type: LOCATION_UPDATE,
        location: {
          pathname:
            'myServiceName/transactions/myTransactionType/myTransactionName/b/c',
          search: '?transactionId=myTransactionId&detailTab=request&spanId=10'
        }
      }
    );

    expect(state).toEqual({
      page: 0,
      serviceName: 'myServiceName',
      spanId: 10,
      transactionId: 'myTransactionId',
      transactionName: 'myTransactionName',
      detailTab: 'request',
      transactionType: 'myTransactionType'
    });
  });

  it('should handle LOCATION_UPDATE for error section', () => {
    const state = reducer(
      {},
      {
        type: LOCATION_UPDATE,
        location: {
          pathname: 'myServiceName/errors/myErrorGroupId',
          search: '?detailTab=request&transactionId=myTransactionId'
        }
      }
    );

    expect(state).toEqual(
      expect.objectContaining({
        serviceName: 'myServiceName',
        errorGroupId: 'myErrorGroupId',
        detailTab: 'request',
        transactionId: 'myTransactionId'
      })
    );
  });

  it('should handle TIMEPICKER_UPDATE', () => {
    const state = reducer(
      {},
      updateTimePicker({
        min: 'minTime',
        max: 'maxTime'
      })
    );

    expect(state).toEqual({ end: 'maxTime', start: 'minTime' });
  });
});
