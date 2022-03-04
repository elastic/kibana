/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getButtonText, getIconType, onToggle } from './helpers';

describe('helpers', () => {
  describe('getIconType', () => {
    describe('when alertViewSelection is trend', () => {
      const alertViewSelection = 'trend';

      it('returns the expected icon when showTrendChart is true', () => {
        expect(
          getIconType({
            alertViewSelection,
            showRiskChart: false,
            showTrendChart: true,
          })
        ).toEqual('eyeClosed');
      });

      it('returns the expected icon when showTrendChart is false', () => {
        expect(
          getIconType({
            alertViewSelection,
            showRiskChart: false,
            showTrendChart: false,
          })
        ).toEqual('eye');
      });
    });

    describe('when alertViewSelection is risk', () => {
      const alertViewSelection = 'risk';

      it('returns the expected icon when showRiskChart is true', () => {
        expect(
          getIconType({
            alertViewSelection,
            showRiskChart: true,
            showTrendChart: false,
          })
        ).toEqual('eyeClosed');
      });

      it('returns the expected icon when showRiskChart is false', () => {
        expect(
          getIconType({
            alertViewSelection,
            showRiskChart: false,
            showTrendChart: false,
          })
        ).toEqual('eye');
      });
    });
  });

  describe('getButtonText', () => {
    describe('when alertViewSelection is trend', () => {
      const alertViewSelection = 'trend';

      it('returns the expected button text when showTrendChart is true', () => {
        expect(
          getButtonText({
            alertViewSelection,
            showRiskChart: false,
            showTrendChart: true,
          })
        ).toEqual('Hide charts');
      });

      it('returns the expected button text when showTrendChart is false', () => {
        expect(
          getButtonText({
            alertViewSelection,
            showRiskChart: false,
            showTrendChart: false,
          })
        ).toEqual('Show charts');
      });
    });

    describe('when alertViewSelection is risk', () => {
      const alertViewSelection = 'risk';

      it('returns the expected button text when showRiskChart is true', () => {
        expect(
          getButtonText({
            alertViewSelection,
            showRiskChart: true,
            showTrendChart: false,
          })
        ).toEqual('Hide chart');
      });

      it('returns the expected button text when showRiskChart is false', () => {
        expect(
          getButtonText({
            alertViewSelection,
            showRiskChart: false,
            showTrendChart: false,
          })
        ).toEqual('Show chart');
      });
    });
  });

  describe('onToggle', () => {
    const setShowCountTable = jest.fn();
    const setShowRiskChart = jest.fn();
    const setShowTrendChart = jest.fn();

    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('when alertViewSelection is trend', () => {
      const alertViewSelection = 'trend';
      const showCountTable = false;
      const showRiskChart = true; // currently showing
      const showTrendChart = false;

      it('invokes `setShowTrendChart` with the opposite value of `showTrendChart`', () => {
        onToggle({
          alertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
          showCountTable,
          showRiskChart,
          showTrendChart,
        });

        expect(setShowTrendChart).toBeCalledWith(!showTrendChart);
      });

      it('invokes `setShowCountTable` with the opposite value of `showCountTable`', () => {
        onToggle({
          alertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
          showCountTable,
          showRiskChart,
          showTrendChart,
        });

        expect(setShowCountTable).toBeCalledWith(!showCountTable);
      });

      it('invokes `setShowRiskChart` with false', () => {
        onToggle({
          alertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
          showCountTable,
          showRiskChart,
          showTrendChart,
        });

        expect(setShowRiskChart).toBeCalledWith(false);
      });
    });

    describe('when alertViewSelection is risk', () => {
      const alertViewSelection = 'risk';
      const showCountTable = true; // currently showing
      const showRiskChart = false;
      const showTrendChart = true; // also currently showing

      it('invokes `setShowTrendChart` with false', () => {
        onToggle({
          alertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
          showCountTable,
          showRiskChart,
          showTrendChart,
        });

        expect(setShowTrendChart).toBeCalledWith(false);
      });

      it('invokes `setShowCountTable` with false', () => {
        onToggle({
          alertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
          showCountTable,
          showRiskChart,
          showTrendChart,
        });

        expect(setShowCountTable).toBeCalledWith(!showCountTable);
      });

      it('invokes `setShowRiskChart` with the opposite value of `showRiskChart`', () => {
        onToggle({
          alertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
          showCountTable,
          showRiskChart,
          showTrendChart,
        });

        expect(setShowRiskChart).toBeCalledWith(!showRiskChart);
      });
    });
  });
});
