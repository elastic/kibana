/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { AlertMonitorStatusComponent, AlertMonitorStatusProps } from './alert_monitor_status';

describe('alert monitor status component', () => {
  describe('AlertMonitorStatus', () => {
    const defaultProps: AlertMonitorStatusProps = {
      alertParams: {
        numTimes: 3,
        search: 'monitor.id: foo',
        timerangeUnit: 'h',
        timerangeCount: 21,
      },
      enabled: true,
      hasFilters: false,
      isOldAlert: true,
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
          <EuiCallOut
            iconType="iInCircle"
            size="s"
            title={
              <span>
                <FormattedMessage
                  defaultMessage="This alert will apply to approximately {snapshotCount} monitors."
                  id="xpack.uptime.alerts.monitorStatus.monitorCallOut.title"
                  values={
                    Object {
                      "snapshotCount": 0,
                    }
                  }
                />
                 
              </span>
            }
          />
          <EuiSpacer
            size="s"
          />
          <AlertQueryBar
            onChange={[Function]}
            query="monitor.id: foo"
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
            size="m"
          />
        </Fragment>
      `);
    });
  });
});
