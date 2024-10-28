/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AssetDetailsLocator,
  AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { getInfraContainerHref, getInfraKubernetesHref, getInfraIpHref } from './get_infra_href';
import { MonitorSummary, makePing, Ping } from '../../../../../common/runtime_types';

const mockAssetDetailsLocator = {
  getRedirectUrl: jest
    .fn()
    .mockImplementation(
      ({ assetId, assetType }: AssetDetailsLocatorParams) => `/node-mock/${assetType}/${assetId}`
    ),
} as unknown as jest.Mocked<AssetDetailsLocator>;

describe('getInfraHref', () => {
  let summary: MonitorSummary;
  beforeEach(() => {
    const ping: Ping = {
      ...makePing({
        docId: 'myDocId',
        type: 'test',
        id: 'myId',
        ip: '151.101.202.217',
        status: 'up',
        duration: 123,
        timestamp: '123',
      }),
      container: { id: 'test-container-id' },
      kubernetes: { pod: { uid: 'test-pod-uid' } },
    };

    summary = {
      monitor_id: 'foo',
      state: {
        summaryPings: [ping],
        summary: {},
        url: {},
        monitor: { type: 'http' },
        timestamp: '123',
      },
    };
  });

  it('getInfraContainerHref creates a link for valid parameters', () => {
    const result = getInfraContainerHref(summary, mockAssetDetailsLocator);
    expect(result).toMatchInlineSnapshot(`"/node-mock/container/test-container-id"`);
  });

  it('getInfraContainerHref returns undefined when no locator is available', () => {
    expect(getInfraContainerHref(summary, undefined)).toBeUndefined();
  });

  it('getInfraContainerHref returns undefined when no container id is present', () => {
    summary.state.summaryPings = [];
    expect(getInfraContainerHref(summary, mockAssetDetailsLocator)).toBeUndefined();
  });

  it('getInfraContainerHref returns the first item when multiple container ids are supplied', () => {
    const pingBase = makePing({
      docId: 'myDocId',
      type: 'test',
      id: 'myId',
      ip: '151.101.202.217',
      status: 'up',
      duration: 123,
      timestamp: '123',
    });
    const pingTestContainerId: Ping = {
      ...pingBase,
      container: { id: 'test-container-id' },
    };
    const pingTestFooContainerId: Ping = {
      ...pingBase,
      container: { id: 'test-container-id-foo' },
    };
    summary.state.summaryPings = [pingTestContainerId, pingTestFooContainerId];
    expect(getInfraContainerHref(summary, mockAssetDetailsLocator)).toMatchInlineSnapshot(
      `"/node-mock/container/test-container-id"`
    );
  });

  it('getInfraContainerHref returns undefined when summaryPings are undefined', () => {
    // @ts-expect-error
    delete summary.state.summaryPings;
    expect(getInfraContainerHref(summary, mockAssetDetailsLocator)).toBeUndefined();
  });

  it('getInfraKubernetesHref creates a link for valid parameters', () => {
    const result = getInfraKubernetesHref(summary, mockAssetDetailsLocator);
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(`"/node-mock/pod/test-pod-uid"`);
  });

  it('getInfraKubernetesHref return undefined when no locator is available', () => {
    expect(getInfraKubernetesHref(summary, undefined)).toBeUndefined();
  });

  it('getInfraKubernetesHref returns undefined when no pod data is present', () => {
    summary.state.summaryPings = [];
    expect(getInfraKubernetesHref(summary, mockAssetDetailsLocator)).toBeUndefined();
  });

  it('getInfraKubernetesHref selects the first pod uid when there are multiple', () => {
    const pingBase = makePing({
      docId: 'myDocId',
      type: 'test',
      id: 'myId',
      ip: '151.101.202.217',
      status: 'up',
      duration: 123,
      timestamp: '123',
    });
    const pingTestPodId: Ping = {
      ...pingBase,
      kubernetes: { pod: { uid: 'test-pod-uid' } },
    };
    const pingTestBarPodId: Ping = {
      ...pingBase,
      kubernetes: { pod: { uid: 'test-pod-uid-bar' } },
    };
    summary.state.summaryPings = [pingTestPodId, pingTestBarPodId];
    expect(getInfraKubernetesHref(summary, mockAssetDetailsLocator)).toMatchInlineSnapshot(
      `"/node-mock/pod/test-pod-uid"`
    );
  });

  it('getInfraKubernetesHref returns undefined when summaryPings are undefined', () => {
    // @ts-expect-error
    delete summary.state.summaryPings;
    expect(getInfraKubernetesHref(summary, mockAssetDetailsLocator)).toBeUndefined();
  });

  it('getInfraKubernetesHref returns undefined when summaryPings are null', () => {
    delete summary.state.summaryPings![0]!.kubernetes!.pod!.uid;
    expect(getInfraKubernetesHref(summary, mockAssetDetailsLocator)).toBeUndefined();
  });

  it('getInfraIpHref creates a link for valid parameters', () => {
    const result = getInfraIpHref(summary, 'bar');
    expect(result).toMatchInlineSnapshot(
      `"bar/app/metrics/inventory?waffleFilter=(expression:'host.ip%20%3A%20151.101.202.217',kind:kuery)"`
    );
  });

  it('getInfraIpHref does not specify a base path when none is available', () => {
    expect(getInfraIpHref(summary, '')).toMatchInlineSnapshot(
      `"/app/metrics/inventory?waffleFilter=(expression:'host.ip%20%3A%20151.101.202.217',kind:kuery)"`
    );
  });

  it('getInfraIpHref returns undefined when ip is undefined', () => {
    summary.state.summaryPings = [];
    expect(getInfraIpHref(summary, 'foo')).toBeUndefined();
  });

  it('getInfraIpHref returns undefined when ip is null', () => {
    delete summary.state.summaryPings![0].monitor.ip;
    expect(getInfraIpHref(summary, 'foo')).toBeUndefined();
  });

  it('getInfraIpHref returns a url for ors between multiple ips', () => {
    const pingOne = makePing({
      docId: 'myDocId',
      type: 'test',
      id: 'myId',
      ip: '152.151.23.192',
      status: 'up',
      duration: 123,
      timestamp: '123',
    });
    const pingTwo = makePing({
      docId: 'myDocId2',
      type: 'test',
      id: 'myId',
      ip: '151.101.202.217',
      status: 'up',
      duration: 123,
      timestamp: '123',
    });
    summary.state.summaryPings = [pingOne, pingTwo];
    expect(getInfraIpHref(summary, 'foo')).toMatchInlineSnapshot(
      `"foo/app/metrics/inventory?waffleFilter=(expression:'host.ip%20%3A%20152.151.23.192%20or%20host.ip%20%3A%20151.101.202.217',kind:kuery)"`
    );
  });

  it('getInfraIpHref returns undefined if summaryPings are undefined', () => {
    // @ts-expect-error
    delete summary.state.summaryPings;
    expect(getInfraIpHref(summary, 'foo')).toBeUndefined();
  });
});
