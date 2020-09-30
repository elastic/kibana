/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    mock = await inspectSearchParams((setup) => getTraceItems('foo', setup));

    expect(mock.params).toMatchSnapshot();
  });
});
