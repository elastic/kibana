/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSLO } from '.';
import { createSLO } from '../../services/slo/fixtures/slo';
import { Duration, DurationUnit } from '../../types/models/duration';

describe('validateSLO', () => {
  describe('any slo', () => {
    it("throws when 'objective.target' is lte 0", () => {
      const slo = createSLO({ objective: { target: 0 } });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.target');
    });

    it("throws when 'objective.target' is gt 1", () => {
      const slo = createSLO({ objective: { target: 1.0001 } });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.target');
    });

    it("throws when time window duration unit is 'm'", () => {
      const slo = createSLO({
        time_window: { duration: new Duration(1, DurationUnit.m), is_rolling: true },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid time_window.duration');
    });

    it("throws when time window duration unit is 'h'", () => {
      const slo = createSLO({
        time_window: { duration: new Duration(1, DurationUnit.h), is_rolling: true },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid time_window.duration');
    });
  });

  describe('slo with timeslices budgeting method', () => {
    it("throws when 'objective.timeslice_target' is not present", () => {
      const slo = createSLO({
        budgeting_method: 'timeslices',
        objective: {
          target: 0.95,
          timeslice_window: new Duration(1, DurationUnit.m),
        },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_target');
    });

    it("throws when 'objective.timeslice_target' is lte 0", () => {
      const slo = createSLO({
        budgeting_method: 'timeslices',
        objective: {
          target: 0.95,
          timeslice_target: 0,
          timeslice_window: new Duration(1, DurationUnit.m),
        },
      });

      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_target');
    });

    it("throws when 'objective.timeslice_target' is gt 1", () => {
      const slo = createSLO({
        budgeting_method: 'timeslices',
        objective: {
          target: 0.95,
          timeslice_target: 1.001,
          timeslice_window: new Duration(1, DurationUnit.m),
        },
      });
      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_target');
    });

    it("throws when 'objective.timeslice_window' is not present", () => {
      const slo = createSLO({
        budgeting_method: 'timeslices',
        objective: {
          target: 0.95,
          timeslice_target: 0.95,
        },
      });

      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_window');
    });

    it("throws when 'objective.timeslice_window' is not in minutes or hours", () => {
      const slo = createSLO({
        budgeting_method: 'timeslices',
        objective: {
          target: 0.95,
          timeslice_target: 0.95,
        },
      });

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timeslice_window: new Duration(1, DurationUnit.d) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timeslice_window: new Duration(1, DurationUnit.w) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timeslice_window: new Duration(1, DurationUnit.M) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timeslice_window: new Duration(1, DurationUnit.Q) },
        })
      ).toThrowError('Invalid objective.timeslice_window');

      expect(() =>
        validateSLO({
          ...slo,
          objective: { ...slo.objective, timeslice_window: new Duration(1, DurationUnit.Y) },
        })
      ).toThrowError('Invalid objective.timeslice_window');
    });

    it("throws when 'objective.timeslice_window' is longer than 'slo.time_window'", () => {
      const slo = createSLO({
        time_window: { duration: new Duration(1, DurationUnit.w), is_rolling: true },
        budgeting_method: 'timeslices',
        objective: {
          target: 0.95,
          timeslice_target: 0.95,
          timeslice_window: new Duration(169, DurationUnit.h), // 1 week + 1 hours = 169 hours
        },
      });

      expect(() => validateSLO(slo)).toThrowError('Invalid objective.timeslice_window');
    });
  });
});
