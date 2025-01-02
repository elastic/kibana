/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getTraceItems } from './get_trace_items';
import { SearchParamsMock, inspectSearchParams } from '../../utils/test_helpers';

describe('trace queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches a trace', async () => {
    mock = await inspectSearchParams(({ mockConfig, mockApmEventClient }) =>
      getTraceItems({
        traceId: 'foo',
        config: mockConfig,
        apmEventClient: mockApmEventClient,
        start: 0,
        end: 50000,
        logger: loggerMock.create(),
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
