/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTraceItems } from './get_trace_items';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';

describe('trace queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches a trace', async () => {
    mock = await inspectSearchParams((setup) =>
      getTraceItems('foo', setup, 0, 50000)
    );

    expect(mock.params).toMatchSnapshot();
  });
});
