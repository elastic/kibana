/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApmHref } from '../get_apm_href';
import { LatestMonitor } from '../../../../../common/graphql/types';

describe('getApmHref', () => {
  let monitor: LatestMonitor;

  beforeEach(() => {
    monitor = {
      id: {
        key: 'monitorId',
      },
      ping: {
        timestamp: 'foo',
        url: {
          domain: 'www.elastic.co',
        },
      },
    };
  });

  it('creates href with base path when present', () => {
    const result = getApmHref(monitor, 'foo', 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });

  it('does not add a base path or extra slash when base path is undefined', () => {
    const result = getApmHref(monitor, '', 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });
});
