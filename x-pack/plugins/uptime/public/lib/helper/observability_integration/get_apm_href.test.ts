/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLegacyApmHref } from './get_apm_href';
import { MonitorSummary, makePing } from '../../../../common/runtime_types';

describe('getLegacyApmHref', () => {
  let summary: MonitorSummary;
  beforeEach(() => {
    summary = {
      monitor_id: 'foo',
      state: {
        summary: {},
        monitor: { type: 'http' },
        summaryPings: [
          makePing({
            docId: 'foo',
            id: 'foo',
            type: 'test',
            ip: '151.101.202.217',
            status: 'up',
            timestamp: '123',
            duration: 123,
          }),
        ],
        timestamp: '123',
        url: {
          full: 'https://www.elastic.co/',
          domain: 'www.elastic.co',
        },
      },
    };
  });

  it('creates href with base path when present', () => {
    const result = getLegacyApmHref(summary, 'foo', 'now-15m', 'now');
    expect(result).toMatchInlineSnapshot(
      `"foo/app/apm#/services?kuery=url.domain:%20%22www.elastic.co%22&rangeFrom=now-15m&rangeTo=now"`
    );
  });

  it('does not add a base path or extra slash when base path is empty string', () => {
    const result = getLegacyApmHref(summary, '', 'now-15m', 'now');
    expect(result).toMatchInlineSnapshot(
      `"/app/apm#/services?kuery=url.domain:%20%22www.elastic.co%22&rangeFrom=now-15m&rangeTo=now"`
    );
  });

  describe('with service.name', () => {
    const serviceName = 'MyServiceName';
    beforeEach(() => {
      summary.state.service = { name: serviceName };
    });

    it('links to the named service', () => {
      const result = getLegacyApmHref(summary, 'foo', 'now-15m', 'now');
      expect(result).toMatchInlineSnapshot(
        `"foo/app/apm#/services?kuery=service.name:%20%22${serviceName}%22&rangeFrom=now-15m&rangeTo=now"`
      );
    });
  });
});
