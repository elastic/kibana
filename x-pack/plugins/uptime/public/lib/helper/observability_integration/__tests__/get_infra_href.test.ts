/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInfraContainerHref, getInfraKubernetesHref, getInfraIpHref } from '../get_infra_href';
import { LatestMonitor } from '../../../../../common/graphql/types';

describe('getInfraHref', () => {
  let monitor: LatestMonitor;
  beforeEach(() => {
    monitor = {
      id: {
        key: 'foo',
        url: 'http://bar.com/',
      },
      ping: {
        timestamp: '1557405354000',
        container: {
          id: 'test-container-id',
        },
        kubernetes: {
          pod: {
            uid: 'test-pod-uid',
          },
        },
        monitor: {
          ip: '151.101.202.217',
        },
      },
    };
  });

  it('getInfraContainerHref creates a link for valid parameters', () => {
    expect.assertions(2);
    const result = getInfraContainerHref(monitor, 'foo');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('getInfraContainerHref does not specify a base path when none is available', () => {
    expect.assertions(1);
    expect(getInfraContainerHref(monitor, '')).toMatchSnapshot();
  });

  it('getInfraContainerHref returns undefined when no container id is present', () => {
    expect.assertions(1);
    delete monitor.ping;
    expect(getInfraContainerHref(monitor, 'foo')).toBeUndefined();
  });

  it('getInfraKubernetesHref creates a link for valid parameters', () => {
    expect.assertions(2);
    const result = getInfraKubernetesHref(monitor, 'foo');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('getInfraKubernetesHref does not specify a base path when none is available', () => {
    expect.assertions(1);
    expect(getInfraKubernetesHref(monitor, '')).toMatchSnapshot();
  });

  it('getInfraKubernetesHref returns undefined when no pod data is present', () => {
    expect.assertions(1);
    delete monitor.ping;
    expect(getInfraKubernetesHref(monitor, 'foo')).toBeUndefined();
  });

  it('getInfraIpHref creates a link for valid parameters', () => {
    expect.assertions(2);
    const result = getInfraIpHref(monitor, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchSnapshot();
  });

  it('getInfraIpHref does not specify a base path when none is available', () => {
    expect.assertions(1);
    expect(getInfraIpHref(monitor, '')).toMatchSnapshot();
  });

  it('getInfraIpHref returns undefined when ip is present', () => {
    expect.assertions(1);
    delete monitor.ping;
    expect(getInfraIpHref(monitor, 'foo')).toBeUndefined();
  });
});
