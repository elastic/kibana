/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/dom';
import { AlertMonitorStatusComponent, AlertMonitorStatusProps } from './alert_monitor_status';
import { render } from '../../../../lib/helper/rtl_helpers';

// Failing: See https://github.com/elastic/kibana/issues/98910
describe.skip('alert monitor status component', () => {
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

    it('passes default props to children', async () => {
      render(<AlertMonitorStatusComponent {...defaultProps} />);

      expect(
        await screen.findByText('This alert will apply to approximately 0 monitors.')
      ).toBeInTheDocument();
      expect(await screen.findByText('Add filter')).toBeInTheDocument();
      expect(await screen.findByText('Availability')).toBeInTheDocument();
      expect(await screen.findByText('Status check')).toBeInTheDocument();
      expect(await screen.findByText('matching monitors are up in')).toBeInTheDocument();
      expect(await screen.findByText('days')).toBeInTheDocument();
      expect(await screen.findByText('hours')).toBeInTheDocument();
      expect(await screen.findByText('within the last')).toBeInTheDocument();
    });
  });
});
