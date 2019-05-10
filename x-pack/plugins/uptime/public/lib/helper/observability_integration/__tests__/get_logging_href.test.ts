/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getLoggingContainerHref,
  getLoggingKubernetesHref,
  getLoggingIpHref,
} from '../get_logging_href';
import { LatestMonitor } from '../../../../../common/graphql/types';

describe('getLoggingHref', () => {
  let monitor: LatestMonitor;

  beforeEach(() => {
    monitor = {
      id: {
        key: 'monitorId',
      },
      ping: {
        container: {
          id: 'test-container-id',
        },
        kubernetes: {
          pod: {
            uid: 'test-pod-id',
          },
        },
        monitor: {
          ip: '151.101.202.217',
        },
        timestamp: 'foo',
        url: {
          domain: 'www.elastic.co',
        },
      },
    };
  });

  it('creates a container href with base path when present', () => {
    const result = getLoggingContainerHref(monitor, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it(`creates a container href without a base path if it's an empty string`, () => {
    const result = getLoggingContainerHref(monitor, '');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it(`creates an ip href with base path when present`, () => {
    const result = getLoggingKubernetesHref(monitor, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('creates a pod href with base path when present', () => {
    const result = getLoggingKubernetesHref(monitor, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it(`creates a pod href without a base path when it's an empty string`, () => {
    const result = getLoggingKubernetesHref(monitor, '');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it(`creates an ip href without a base path when it's an empty string`, () => {
    const result = getLoggingIpHref(monitor, '');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('returns undefined if necessary container is not present', () => {
    expect.assertions(1);
    delete monitor.ping;
    expect(getLoggingContainerHref(monitor, '')).toBeUndefined();
  });

  it('returns undefined if necessary pod is not present', () => {
    expect.assertions(1);
    delete monitor.ping;
    expect(getLoggingKubernetesHref(monitor, '')).toBeUndefined();
  });

  it('returns undefined ip href if ip is not present', () => {
    expect.assertions(1);
    delete monitor.ping;
    expect(getLoggingIpHref(monitor, '')).toBeUndefined();
  });
});
