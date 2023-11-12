/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';

import { sloList } from '../../../data/slo/slo';
import { render } from '../../../utils/test_helper';
import { SloSummary } from './slo_summary';
import { ActiveAlerts, useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { ALL_VALUE } from '@kbn/slo-schema';

jest.mock('../../../hooks/slo/use_fetch_active_alerts');
const useFetchActiveAlertsMock = useFetchActiveAlerts as jest.Mock;

describe('SLO Alert Summary', () => {
  describe('Multiple selected SLOs', () => {
    it('displays 0 alerts when there are no active alerts', async () => {
      const { results } = sloList;
      const slos = results.map((slo) => ({
        id: slo.id,
        instanceId: slo.instanceId,
        name: slo.name,
      }));
      const activeAlerts = new Map();
      activeAlerts.set('1f1c6ee7-433f-4b56-b727-5682262e0d7d|*', 1);
      jest
        .spyOn(ActiveAlerts.prototype, 'get')
        .mockImplementation((slo) => activeAlerts.get(`${slo.id}|${slo.instanceId ?? ALL_VALUE}`));

      useFetchActiveAlertsMock.mockReturnValue({
        isLoading: false,
        data: new ActiveAlerts({ '1f1c6ee7-433f-4b56-b727-5682262e0d7d|*': 1 }),
      });

      render(<SloSummary slos={slos} />);
      expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('1');
    });

    describe('Partition by SLOs', () => {});
  });

  describe('One selected SLO', () => {});
});
