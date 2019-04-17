/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApmIntegrationAction } from '../get_apm_integration_action';
import { LatestMonitor } from '../../../../../common/graphql/types';

describe('getApmIntegrationAction', () => {
  let monitor: LatestMonitor;

  beforeEach(() => {
    monitor = {
      id: {
        key: 'foo',
      },
      ping: {
        timestamp: '1929304912',
        url: {
          domain: 'bar',
        },
      },
    };
  });

  it('creates expected action object', () => {
    const result = getApmIntegrationAction('foo', 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });

  it('attempts to navigate to the correct path', () => {
    const mockWindowLocationAssign = (window.location.assign = jest.fn());
    const actionObject = getApmIntegrationAction('now-15m', 'now', 'foo');
    actionObject.onClick(monitor);
    expect(mockWindowLocationAssign).toHaveBeenCalledTimes(1);
    expect(mockWindowLocationAssign).toHaveBeenCalledWith(
      '/foo/app/apm#/services?kuery=url.domain:%20%22bar%22&rangeFrom=now-15m&rangeTo=now'
    );
  });

  it('attempts to navigate to the correct path when no basePath supplied', () => {
    const mockWindowLocationAssign = (window.location.assign = jest.fn());
    const actionObject = getApmIntegrationAction('now-15m', 'now');
    actionObject.onClick(monitor);
    expect(mockWindowLocationAssign).toHaveBeenCalledTimes(1);
    expect(mockWindowLocationAssign).toHaveBeenCalledWith(
      '/app/apm#/services?kuery=url.domain:%20%22bar%22&rangeFrom=now-15m&rangeTo=now'
    );
  });

  it('attempts to navigate to the correct path when basePath is empty string', () => {
    const mockWindowLocationAssign = (window.location.assign = jest.fn());
    const actionObject = getApmIntegrationAction('now-15m', 'now', '');
    actionObject.onClick(monitor);
    expect(mockWindowLocationAssign).toHaveBeenCalledTimes(1);
    expect(mockWindowLocationAssign).toHaveBeenCalledWith(
      '/app/apm#/services?kuery=url.domain:%20%22bar%22&rangeFrom=now-15m&rangeTo=now'
    );
  });
});
