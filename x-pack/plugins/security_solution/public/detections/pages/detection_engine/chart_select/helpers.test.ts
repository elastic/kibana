/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartCount, RISK_ID, TREND_ID, updateChartVisiblityOnSelection } from './helpers';

describe('helpers', () => {
  describe('getChartCount', () => {
    it('returns the expected count when alertViewSelection is risk', () => {
      expect(getChartCount(RISK_ID)).toEqual(1);
    });

    it('returns the expected count when alertViewSelection is trend', () => {
      expect(getChartCount(TREND_ID)).toEqual(2);
    });
  });

  describe('updateChartVisiblityOnSelection', () => {
    const setAlertViewSelection = jest.fn();
    const setShowCountTable = jest.fn();
    const setShowRiskChart = jest.fn();
    const setShowTrendChart = jest.fn();

    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('when alertViewSelection is trend', () => {
      const alertViewSelection = TREND_ID;

      it('invokes `setShowRiskChart` with false', () => {
        updateChartVisiblityOnSelection({
          alertViewSelection,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });

        expect(setShowRiskChart).toBeCalledWith(false);
      });

      it('invokes `setShowTrendChart` with true', () => {
        updateChartVisiblityOnSelection({
          alertViewSelection,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });

        expect(setShowTrendChart).toBeCalledWith(true);
      });

      it('invokes `setShowCountTable` with true', () => {
        updateChartVisiblityOnSelection({
          alertViewSelection,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });

        expect(setShowCountTable).toBeCalledWith(true);
      });
    });

    describe('when alertViewSelection is risk', () => {
      const alertViewSelection = RISK_ID;

      it('invokes `setShowTrendChart` with false', () => {
        updateChartVisiblityOnSelection({
          alertViewSelection,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });

        expect(setShowTrendChart).toBeCalledWith(false);
      });

      it('invokes `setShowCountTable` with false', () => {
        updateChartVisiblityOnSelection({
          alertViewSelection,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });

        expect(setShowCountTable).toBeCalledWith(false);
      });

      it('invokes `setShowRiskChart` with true', () => {
        updateChartVisiblityOnSelection({
          alertViewSelection,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });

        expect(setShowRiskChart).toBeCalledWith(true);
      });
    });
  });
});
