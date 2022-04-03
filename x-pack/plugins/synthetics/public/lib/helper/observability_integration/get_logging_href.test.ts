/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLoggingContainerHref,
  getLoggingKubernetesHref,
  getLoggingIpHref,
} from './get_logging_href';
import { MonitorSummary, makePing } from '../../../../common/runtime_types';

describe('getLoggingHref', () => {
  let summary: MonitorSummary;

  beforeEach(() => {
    const ping = makePing({
      docId: 'myDocId',
      type: 'test',
      id: 'myId',
      ip: '151.101.202.217',
      status: 'up',
      duration: 123,
      timestamp: '123',
    });
    ping.container = {
      id: 'test-container-id',
    };
    ping.kubernetes = {
      pod: {
        uid: 'test-pod-id',
      },
    };
    summary = {
      monitor_id: 'foo',
      state: {
        summary: {},
        summaryPings: [ping],
        timestamp: '123',
        monitor: { type: 'http' },
        url: {},
      },
    };
  });

  it('creates a container href with base path when present', () => {
    const result = getLoggingContainerHref(summary, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(
      `"bar/app/logs?logFilter=(expression:'container.id%20:%20test-container-id',kind:kuery)"`
    );
  });

  it(`creates a container href without a base path if it's an empty string`, () => {
    const result = getLoggingContainerHref(summary, '');
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(
      `"/app/logs?logFilter=(expression:'container.id%20:%20test-container-id',kind:kuery)"`
    );
  });

  it(`creates an ip href with base path when present`, () => {
    const result = getLoggingKubernetesHref(summary, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(
      `"bar/app/logs?logFilter=(expression:'pod.uid%20:%20test-pod-id',kind:kuery)"`
    );
  });

  it('creates a pod href with base path when present', () => {
    const result = getLoggingKubernetesHref(summary, 'bar');
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(
      `"bar/app/logs?logFilter=(expression:'pod.uid%20:%20test-pod-id',kind:kuery)"`
    );
  });

  it(`creates a pod href without a base path when it's an empty string`, () => {
    const result = getLoggingKubernetesHref(summary, '');
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(
      `"/app/logs?logFilter=(expression:'pod.uid%20:%20test-pod-id',kind:kuery)"`
    );
  });

  it(`creates an ip href without a base path when it's an empty string`, () => {
    const result = getLoggingIpHref(summary, '');
    expect(result).not.toBeUndefined();
    expect(result).toMatchInlineSnapshot(
      `"/app/logs?logFilter=(expression:'host.ip%20%3A%20151.101.202.217',kind:kuery)"`
    );
  });

  it('returns undefined if necessary container is not present', () => {
    // @ts-expect-error According to the code, the property is optional
    delete summary.state.summaryPings;
    expect(getLoggingContainerHref(summary, '')).toBeUndefined();
  });

  it('returns undefined if necessary container is null', () => {
    delete summary.state.summaryPings![0].container!.id;
    expect(getLoggingContainerHref(summary, '')).toBeUndefined();
  });

  it('returns undefined if necessary pod is not present', () => {
    // @ts-expect-error According to the code, the property is optional
    delete summary.state.summaryPings;
    expect(getLoggingKubernetesHref(summary, '')).toBeUndefined();
  });

  it('returns undefined if necessary pod is null', () => {
    delete summary.state.summaryPings![0].kubernetes!.pod!.uid;
    expect(getLoggingKubernetesHref(summary, '')).toBeUndefined();
  });

  it('returns undefined ip href if ip is not present', () => {
    // @ts-expect-error According to the code, the property is optional
    delete summary.state.summaryPings;
    expect(getLoggingIpHref(summary, '')).toBeUndefined();
  });

  it('returns undefined ip href if ip is null', () => {
    delete summary.state.summaryPings![0].monitor.ip;
    expect(getLoggingIpHref(summary, '')).toBeUndefined();
  });
});
