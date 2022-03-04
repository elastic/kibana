/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsUsingTransactionEvents } from './get_is_using_transaction_events';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../utils/test_helpers';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';

const mockResponseNoHits = {
  took: 398,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 0,
      relation: 'gte' as const,
      max_score: 0,
    },
    hits: [],
  },
};

const mockResponseSomeHits = {
  took: 398,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 3,
      relation: 'gte' as const,
    },
    hits: [],
  },
};

describe('getIsUsingTransactionEvents', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  describe('with config xpack.apm.searchAggregatedTransactions: never', () => {
    const config = {
      searchAggregatedTransactions: SearchAggregatedTransactionSetting.never,
    };

    it('should be false', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        { config }
      );
      expect(mock.response).toBe(false);
    });

    it('should not query for data', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        { config }
      );
      expect(mock.spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('with config xpack.apm.searchAggregatedTransactions: always', () => {
    const config = {
      searchAggregatedTransactions: SearchAggregatedTransactionSetting.always,
    };
    it('should be false when kuery is empty', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        { config }
      );
      expect(mock.response).toBe(false);
    });

    it('should be false when kuery is set and metrics data found', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getIsUsingTransactionEvents({
            setup,
            kuery: 'proccessor.event: "transaction"',
          }),
        {
          config,
          mockResponse: (request) => {
            if (request === 'get_has_aggregated_transactions') {
              return mockResponseSomeHits;
            }
            if (request === 'get_has_transactions') {
              return mockResponseNoHits;
            }
            return mockResponseNoHits;
          },
        }
      );
      expect(mock.spy).toHaveBeenCalledTimes(1);
      expect(mock.response).toBe(false);
    });

    it('should be true when kuery is set and metrics data are not found', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getIsUsingTransactionEvents({
            setup,
            kuery: 'proccessor.event: "transaction"',
          }),
        {
          config,
          mockResponse: (request) => {
            if (request === 'get_has_aggregated_transactions') {
              return mockResponseNoHits;
            }
            if (request === 'get_has_transactions') {
              return mockResponseSomeHits;
            }
            return mockResponseNoHits;
          },
        }
      );
      expect(mock.spy).toHaveBeenCalledTimes(2);
      expect(mock.response).toBe(true);
    });

    it('should not query for data when kuery is empty', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        { config }
      );
      expect(mock.spy).toHaveBeenCalledTimes(0);
    });

    it('should query for data when kuery is set', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getIsUsingTransactionEvents({
            setup,
            kuery: 'proccessor.event: "transaction"',
          }),
        { config }
      );
      expect(mock.spy).toHaveBeenCalledTimes(1);
      expect(mock.params).toMatchSnapshot();
    });
  });

  describe('with config xpack.apm.searchAggregatedTransactions: auto', () => {
    const config = {
      searchAggregatedTransactions: SearchAggregatedTransactionSetting.auto,
    };

    it('should query for data once if metrics data found', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        {
          config,
          mockResponse: (request) => {
            if (request === 'get_has_aggregated_transactions') {
              return mockResponseSomeHits;
            }
            if (request === 'get_has_transactions') {
              return mockResponseNoHits;
            }
            return mockResponseNoHits;
          },
        }
      );
      expect(mock.spy).toHaveBeenCalledTimes(1);
      expect(mock.params).toMatchSnapshot();
    });

    it('should query for data twice if metrics data not found', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        {
          config,
          mockResponse: (request) => {
            if (request === 'get_has_aggregated_transactions') {
              return mockResponseNoHits;
            }
            if (request === 'get_has_transactions') {
              return mockResponseSomeHits;
            }
            return mockResponseNoHits;
          },
        }
      );
      expect(mock.spy).toHaveBeenCalledTimes(2);
      expect(mock.spy.mock.calls).toMatchSnapshot();
    });

    it('should be false if metrics data are found', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        {
          config,
          mockResponse: (request) => {
            if (request === 'get_has_aggregated_transactions') {
              return mockResponseSomeHits;
            }
            if (request === 'get_has_transactions') {
              return mockResponseNoHits;
            }
            return mockResponseNoHits;
          },
        }
      );
      expect(mock.response).toBe(false);
    });

    it('should be true if no metrics data are found', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        {
          config,
          mockResponse: (request) => {
            if (request === 'get_has_aggregated_transactions') {
              return mockResponseNoHits;
            }
            if (request === 'get_has_transactions') {
              return mockResponseSomeHits;
            }
            return mockResponseNoHits;
          },
        }
      );
      expect(mock.response).toBe(true);
    });

    it('should be false if no metrics or transactions data are found', async () => {
      mock = await inspectSearchParams(
        (setup) => getIsUsingTransactionEvents({ setup, kuery: '' }),
        { config, mockResponse: () => mockResponseNoHits }
      );
      expect(mock.response).toBe(false);
    });
  });
});
