/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitorSummary } from '../../../../../../common/runtime_types';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { IntegrationGroup, extractSummaryValues } from '../actions_popover/integration_group';

describe('IntegrationGroup', () => {
  let summary: MonitorSummary;

  beforeEach(() => {
    summary = {
      monitor_id: '12345',
      state: {
        summary: {},
        checks: [],
        timestamp: '123',
        url: {},
      },
    };
  });

  it('will not display APM links when APM is unavailable', () => {
    const component = shallowWithIntl(<IntegrationGroup summary={summary} />);
    expect(component).toMatchSnapshot();
  });

  it('will not display infra links when infra is unavailable', () => {
    const component = shallowWithIntl(<IntegrationGroup summary={summary} />);
    expect(component).toMatchSnapshot();
  });

  it('will not display logging links when logging is unavailable', () => {
    const component = shallowWithIntl(<IntegrationGroup summary={summary} />);
    expect(component).toMatchSnapshot();
  });

  describe('extractSummaryValues', () => {
    let mockSummary: Pick<MonitorSummary, 'state'>;

    beforeEach(() => {
      mockSummary = {
        state: {
          timestamp: 'foo',
          url: {},
        },
      };
    });

    it('provides defaults when values are not present', () => {
      expect(extractSummaryValues(mockSummary)).toMatchInlineSnapshot(`
        Object {
          "containerId": undefined,
          "domain": "",
          "ip": undefined,
          "podUid": undefined,
        }
      `);
    });

    it('finds url domain', () => {
      mockSummary.state.url.domain = 'mydomain';

      expect(extractSummaryValues(mockSummary)).toMatchInlineSnapshot(`
        Object {
          "containerId": undefined,
          "domain": "mydomain",
          "ip": undefined,
          "podUid": undefined,
        }
      `);
    });

    it('finds pod uid', () => {
      mockSummary.state.checks = [
        { kubernetes: { pod: { uid: 'myuid' } }, monitor: { status: 'up' }, timestamp: 123 },
      ];

      expect(extractSummaryValues(mockSummary)).toMatchInlineSnapshot(`
        Object {
          "containerId": undefined,
          "domain": "",
          "ip": undefined,
          "podUid": "myuid",
        }
      `);
    });

    it('does not throw for missing kubernetes fields', () => {
      mockSummary.state.checks = [];

      expect(extractSummaryValues(mockSummary)).toMatchInlineSnapshot(`
        Object {
          "containerId": undefined,
          "domain": "",
          "ip": undefined,
          "podUid": undefined,
        }
      `);
    });

    it('finds container id', () => {
      mockSummary.state.checks = [
        { container: { id: 'mycontainer' }, monitor: { status: 'up' }, timestamp: 123 },
      ];

      expect(extractSummaryValues(mockSummary)).toMatchInlineSnapshot(`
        Object {
          "containerId": "mycontainer",
          "domain": "",
          "ip": undefined,
          "podUid": undefined,
        }
      `);
    });

    it('finds ip field', () => {
      mockSummary.state.checks = [{ monitor: { ip: '127.0.0.1', status: 'up' }, timestamp: 123 }];

      expect(extractSummaryValues(mockSummary)).toMatchInlineSnapshot(`
        Object {
          "containerId": undefined,
          "domain": "",
          "ip": "127.0.0.1",
          "podUid": undefined,
        }
      `);
    });
  });
});
