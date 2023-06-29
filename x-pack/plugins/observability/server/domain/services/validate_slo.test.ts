/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSLO } from '.';
import { oneMinute, sixHours } from '../../services/slo/fixtures/duration';
import { createSLO } from '../../services/slo/fixtures/slo';
import { Duration, DurationUnit } from '../models';

describe('validateSLO', () => {
  describe('any slo', () => {
    it("throws when 'objective.target' is lte 0", () => {
      const slo = createSLO({ objective: { target: 0 } });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.target');
    });

    it("throws when 'objective.target' is gte 1", () => {
      const slo = createSLO({ objective: { target: 1 } });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.target');
    });

    it("throws when time window duration unit is 'm'", () => {
      const slo = createSLO({
        timeWindow: { duration: new Duration(1, DurationUnit.Minute), isRolling: true },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid time_window.duration');
    });

    it("throws when time window duration unit is 'h'", () => {
      const slo = createSLO({
        timeWindow: { duration: new Duration(1, DurationUnit.Hour), isRolling: true },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid time_window.duration');
    });

    it.each([
      { duration: new Duration(1, DurationUnit.Hour), shouldThrow: true },
      { duration: new Duration(2, DurationUnit.Hour), shouldThrow: true },
      { duration: new Duration(1, DurationUnit.Day), shouldThrow: true },
      { duration: new Duration(7, DurationUnit.Day), shouldThrow: true },
      { duration: new Duration(1, DurationUnit.Week), shouldThrow: false },
      { duration: new Duration(2, DurationUnit.Week), shouldThrow: true },
      { duration: new Duration(1, DurationUnit.Month), shouldThrow: false },
      { duration: new Duration(2, DurationUnit.Month), shouldThrow: true },
      { duration: new Duration(1, DurationUnit.Quarter), shouldThrow: true },
      { duration: new Duration(3, DurationUnit.Quarter), shouldThrow: true },
      { duration: new Duration(1, DurationUnit.Year), shouldThrow: true },
      { duration: new Duration(3, DurationUnit.Year), shouldThrow: true },
    ])(
      'throws when time window calendar aligned is not 1 week or 1 month',
      ({ duration, shouldThrow }) => {
        if (shouldThrow) {
          expect(() =>
            validateSLO(
              createSLO({
                timeWindow: { duration, isCalendar: true },
              })
            )
          ).toThrowError('Invalid time_window.duration');
        } else {
          expect(() =>
            validateSLO(
              createSLO({
                timeWindow: { duration, isCalendar: true },
              })
            )
          ).not.toThrowError();
        }
      }
    );

    describe('settings', () => {
      it("throws when frequency is longer or equal than '1h'", () => {
        const slo = createSLO({
          settings: {
            frequency: sixHours(),
            syncDelay: oneMinute(),
          },
        });
        expect(() => validateSLO(slo)).toThrowError('Invalid settings.frequency');
      });

      it("throws when sync_delay is longer or equal than '6h'", () => {
        const slo = createSLO({
          settings: {
            frequency: oneMinute(),
            syncDelay: sixHours(),
          },
        });
        expect(() => validateSLO(slo)).toThrowError('Invalid settings.sync_delay');
      });
    });
  });

  describe('slo with timeslices budgeting method', () => {
    it("throws when 'objective.timeslice_target' is not present", () => {
      const slo = createSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.95,
          timesliceWindow: new Duration(1, DurationUnit.Minute),
        },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_target');
    });

    it("throws when 'objective.timeslice_target' is lte 0", () => {
      const slo = createSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.95,
          timesliceTarget: 0,
          timesliceWindow: new Duration(1, DurationUnit.Minute),
        },
      });

      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_target');
    });

    it("throws when 'objective.timeslice_target' is gt 1", () => {
      const slo = createSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.95,
          timesliceTarget: 1.001,
          timesliceWindow: new Duration(1, DurationUnit.Minute),
        },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_target');
    });

    it("throws when 'objective.timeslice_window' is not present", () => {
      const slo = createSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.95,
          timesliceTarget: 0.95,
        },
      });

      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_window');
    });

    it("throws when 'objective.timeslice_window' is not in minutes or hours", () => {
      const slo = createSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.95,
          timesliceTarget: 0.95,
        },
      });

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timesliceWindow: new Duration(1, DurationUnit.Day) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timesliceWindow: new Duration(1, DurationUnit.Week) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timesliceWindow: new Duration(1, DurationUnit.Month) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timesliceWindow: new Duration(1, DurationUnit.Quarter) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timesliceWindow: new Duration(1, DurationUnit.Year) },
        })
      ).toThrowError('Invalid objective.timeslice_window');
    });

    it("throws when 'objective.timeslice_window' is longer than 'slo.time_window'", () => {
      const slo = createSLO({
        timeWindow: { duration: new Duration(1, DurationUnit.Week), isRolling: true },
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.95,
          timesliceTarget: 0.95,
          timesliceWindow: new Duration(169, DurationUnit.Hour), // 1 week + 1 hours = 169 hours
        },
      });

      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_window');
    });
  });
});
