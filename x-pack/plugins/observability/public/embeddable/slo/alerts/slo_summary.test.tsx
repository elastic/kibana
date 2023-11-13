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
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { ActiveAlerts } from '../../../hooks/slo/active_alerts';

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

      useFetchActiveAlertsMock.mockReturnValue({
        isLoading: false,
        data: new ActiveAlerts(),
      });

      render(<SloSummary slos={slos} />);
      expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('0');
    });

    describe('only 1 selected SLO has active alerts', () => {
      it('displays total alerts when there are alerts from one SLO', async () => {
        const { results } = sloList;
        const slos = results.map((slo) => ({
          id: slo.id,
          instanceId: slo.instanceId,
          name: slo.name,
        }));
        const activeAlertsData = {
          '1f1c6ee7-433f-4b56-b727-5682262e0d7d|*': 1,
        };

        useFetchActiveAlertsMock.mockReturnValue({
          isLoading: false,
          data: new ActiveAlerts(activeAlertsData),
        });

        render(<SloSummary slos={slos} />);
        expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('1');
      });
    });

    describe('multiple SLOs have active alerts', () => {
      it('displays total alerts when multiple selected SLOs have 1 active alert', async () => {
        const { results } = sloList;
        const slos = results.map((slo) => ({
          id: slo.id,
          instanceId: slo.instanceId,
          name: slo.name,
        }));
        const activeAlertsData = {
          '1f1c6ee7-433f-4b56-b727-5682262e0d7d|*': 1,
          'c0f8d669-9177-4706-9098-f397a88173a6|*': 1,
        };

        useFetchActiveAlertsMock.mockReturnValue({
          isLoading: false,
          data: new ActiveAlerts(activeAlertsData),
        });

        render(<SloSummary slos={slos} />);
        expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('2');
      });

      it('displays total alerts when multiple selected SLOs have multiple active alerts', async () => {
        const { results } = sloList;
        const slos = results.map((slo) => ({
          id: slo.id,
          instanceId: slo.instanceId,
          name: slo.name,
        }));
        const activeAlertsData = {
          '1f1c6ee7-433f-4b56-b727-5682262e0d7d|*': 3,
          'c0f8d669-9177-4706-9098-f397a88173a6|*': 2,
        };

        useFetchActiveAlertsMock.mockReturnValue({
          isLoading: false,
          data: new ActiveAlerts(activeAlertsData),
        });

        render(<SloSummary slos={slos} />);
        expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('5');
      });
    });
  });

  describe('One selected SLO', () => {
    it('displays 0 alerts when there are no active alerts', async () => {
      const { results } = sloList;
      const slos = results.map((slo) => ({
        id: slo.id,
        instanceId: slo.instanceId,
        name: slo.name,
      }));
      const selectedSlo = [slos[0]];

      useFetchActiveAlertsMock.mockReturnValue({
        isLoading: false,
        data: new ActiveAlerts(),
      });

      render(<SloSummary slos={selectedSlo} />);
      expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('0');
    });

    it('displays total number of alerts when there are active alerts', async () => {
      const { results } = sloList;
      const slos = results.map((slo) => ({
        id: slo.id,
        instanceId: slo.instanceId,
        name: slo.name,
      }));
      const selectedSlo = [slos[0]];
      const activeAlertsData = {
        '1f1c6ee7-433f-4b56-b727-5682262e0d7d|*': 1,
      };
      useFetchActiveAlertsMock.mockReturnValue({
        isLoading: false,
        data: new ActiveAlerts(activeAlertsData),
      });

      render(<SloSummary slos={selectedSlo} />);

      expect(screen.queryByTestId('sloAlertsSummaryStat')).toHaveTextContent('1');
    });
  });
});
