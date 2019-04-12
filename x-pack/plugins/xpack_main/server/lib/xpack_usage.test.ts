/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchPlugin, Cluster } from 'src/legacy/core_plugins/elasticsearch';
import { XPackUsage, XPackUsageContract } from './xpack_usage';
import { first } from 'rxjs/operators';

interface MockedCluster extends Cluster {
  callWithInternalUser: jest.Mock<any, any>;
  callWithRequest: jest.Mock<any, any>;
}

describe('xpack_usage', () => {
  let logger: (...args: any[]) => void;
  let esPlugin: ElasticsearchPlugin;
  let cluster: MockedCluster;

  beforeEach(() => {
    jest.useFakeTimers();

    logger = jest.fn();
    cluster = {
      callWithInternalUser: jest.fn().mockResolvedValue(null),
      callWithRequest: jest.fn().mockResolvedValue(null),
    };
    esPlugin = {
      getCluster: jest.fn().mockReturnValue(cluster),
      createCluster: jest.fn().mockImplementation(() => {
        throw new Error('should not be called ');
      }),
      waitUntilReady: jest.fn().mockImplementation(() => {
        throw new Error('should not be called ');
      }),
    };
  });

  function expectCallCluster() {
    expect(cluster.callWithInternalUser).toBeCalled();
    expect(cluster.callWithRequest).not.toBeCalled();
  }

  function expectNotCallCluster() {
    expect(cluster.callWithInternalUser).not.toBeCalled();
    expect(cluster.callWithRequest).not.toBeCalled();
  }

  it('can be setup', () => {
    const xpackUsage = new XPackUsage(logger, { pollFrequencyInMillis: 1 });
    const service: XPackUsageContract = xpackUsage.setup({ elasticsearch: esPlugin });
    expect(service.getUsage$).toBeInstanceOf(Function);
    expect(service.refreshNow).toBeInstanceOf(Function);
  });

  it('can be stopped', () => {
    const xpackUsage = new XPackUsage(logger, { pollFrequencyInMillis: 10 });

    xpackUsage.setup({ elasticsearch: esPlugin });

    expectNotCallCluster();

    jest.advanceTimersByTime(10);

    expectCallCluster();

    cluster.callWithInternalUser.mockReset();

    xpackUsage.stop();

    jest.advanceTimersByTime(20);

    expectNotCallCluster();
  });

  it('requests a refresh based on the provided interval', () => {
    const xpackUsage = new XPackUsage(logger, { pollFrequencyInMillis: 10 });

    xpackUsage.setup({ elasticsearch: esPlugin });

    expectNotCallCluster();

    jest.advanceTimersByTime(10);

    expectCallCluster();
  });

  it('can be refreshed on demand', () => {
    const xpackUsage = new XPackUsage(logger, { pollFrequencyInMillis: 1000000 });

    const service: XPackUsageContract = xpackUsage.setup({ elasticsearch: esPlugin });
    jest.advanceTimersByTime(10);

    expectNotCallCluster();

    service.refreshNow();

    expectCallCluster();
  });

  it('returns the xpack usage information from Elasticsearch', () => {
    const xpackUsage = new XPackUsage(logger, { pollFrequencyInMillis: 10 });

    const service: XPackUsageContract = xpackUsage.setup({ elasticsearch: esPlugin });

    cluster.callWithInternalUser.mockResolvedValueOnce({
      security: {
        realms: {},
        token_service: {
          available: true,
          enabled: true,
        },
      },
    });

    service.refreshNow();

    const result = service
      .getUsage$()
      .pipe(first())
      .toPromise();

    expect(result).resolves.toEqual({
      security: {
        realms: {},
        token_service: {
          available: true,
          enabled: true,
        },
      },
    });
  });
});
