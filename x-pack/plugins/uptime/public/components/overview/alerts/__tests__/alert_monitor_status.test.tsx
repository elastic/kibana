/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { AlertMonitorStatusComponent, AlertMonitorStatusProps } from '../alert_monitor_status';

describe('alert monitor status component', () => {
  describe('AlertMonitorStatus', () => {
    const defaultProps: AlertMonitorStatusProps = {
      alertParams: {
        numTimes: 3,
        search: 'monitor.id: foo',
        timerangeUnit: 'h',
        timerangeCount: 21,
      },
      autocomplete: {
        addQuerySuggestionProvider: jest.fn(),
        getQuerySuggestions: jest.fn(),
      },
      enabled: true,
      hasFilters: false,
      isOldAlert: true,
      locations: [],
      shouldUpdateUrl: false,
      snapshotCount: 0,
      snapshotLoading: false,
      numTimes: 14,
      setAlertParams: jest.fn(),
      timerange: { from: 'now-12h', to: 'now' },
    };

    it('passes default props to children', () => {
      const component = shallowWithIntl(<AlertMonitorStatusComponent {...defaultProps} />);
      expect(component).toMatchInlineSnapshot(`
        <Fragment>
          <OldAlertCallOut
            isOldAlert={true}
          />
          <EuiSpacer
            size="m"
          />
          <KueryBar
            aria-label="Input that allows filtering criteria for the monitor status alert"
            autocomplete={
              Object {
                "addQuerySuggestionProvider": [MockFunction],
                "getQuerySuggestions": [MockFunction],
              }
            }
            data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
            defaultKuery="monitor.id: foo"
            shouldUpdateUrl={false}
            updateDefaultKuery={[Function]}
          />
          <EuiSpacer
            size="s"
          />
          <AddFilterButton
            newFilters={Array []}
            onNewFilter={[Function]}
          />
          <FiltersExpressionSelectContainer
            alertParams={
              Object {
                "numTimes": 3,
                "search": "monitor.id: foo",
                "timerangeCount": 21,
                "timerangeUnit": "h",
              }
            }
            newFilters={Array []}
            onRemoveFilter={[Function]}
            setAlertParams={[MockFunction]}
            shouldUpdateUrl={false}
          />
          <EuiHorizontalRule />
          <StatusExpressionSelect
            alertParams={
              Object {
                "numTimes": 3,
                "search": "monitor.id: foo",
                "timerangeCount": 21,
                "timerangeUnit": "h",
              }
            }
            hasFilters={false}
            setAlertParams={[MockFunction]}
          />
          <EuiHorizontalRule />
          <AvailabilityExpressionSelect
            alertParams={
              Object {
                "numTimes": 3,
                "search": "monitor.id: foo",
                "timerangeCount": 21,
                "timerangeUnit": "h",
              }
            }
            isOldAlert={true}
            setAlertParams={[MockFunction]}
          />
          <EuiSpacer
            size="l"
          />
          <EuiCallOut
            iconType="iInCircle"
            size="s"
            title={
              <FormattedMessage
                defaultMessage="This alert will apply to approximately {snapshotCount} monitors."
                id="xpack.uptime.alerts.monitorStatus.monitorCallOut.title"
                values={
                  Object {
                    "snapshotCount": 0,
                  }
                }
              />
            }
          />
          <EuiSpacer
            size="m"
          />
        </Fragment>
      `);
    });
  });
});
