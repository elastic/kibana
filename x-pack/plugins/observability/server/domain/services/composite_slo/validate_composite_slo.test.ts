/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateCompositeSLO } from '.';
import {
  createCompositeSLO,
  createWeightedAverageSource,
} from '../../../services/composite_slo/fixtures/composite_slo';
import { fiveMinute, twoMinute } from '../../../services/slo/fixtures/duration';
import {
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../../../services/slo/fixtures/slo';
import {
  sevenDaysRolling,
  thirtyDaysRolling,
  weeklyCalendarAligned,
} from '../../../services/slo/fixtures/time_window';

describe('validateCompositeSLO', () => {
  it('throws when the number of source SLOs is less than 2', () => {
    const compositeSlo = createCompositeSLO({
      sources: [createWeightedAverageSource()],
    });
    expect(() => validateCompositeSLO(compositeSlo, [])).toThrowError(
      'A composite SLO must contain between 2 and 30 source SLOs.'
    );
  });

  it('throws when the number of source SLOs is more than 30', () => {
    const compositeSlo = createCompositeSLO({
      sources: Array(31)
        .fill(0)
        .map((i) => createWeightedAverageSource()),
    });
    expect(() => validateCompositeSLO(compositeSlo, [])).toThrowError(
      'A composite SLO must contain between 2 and 30 source SLOs.'
    );
  });

  it("throws when specified source SLOs don't match the actual SLO revision", () => {
    const sloOne = createSLO({ revision: 3 });
    const sloTwo = createSLO({ revision: 2 });
    const compositeSlo = createCompositeSLO({
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: sloTwo.id, revision: 1 }),
      ],
    });
    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'One or many source SLOs are not matching the specified id and revision.'
    );
  });

  it('throws when specified source SLOs refers to a non-existant SLO', () => {
    const sloOne = createSLO({ revision: 3 });
    const compositeSlo = createCompositeSLO({
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: 'non-existant' }),
      ],
    });
    expect(() => validateCompositeSLO(compositeSlo, [sloOne])).toThrowError(
      'One or many source SLOs are not matching the specified id and revision.'
    );
  });

  it('throws when the time window is not the same accros all source SLOs', () => {
    const sloOne = createSLO({ timeWindow: sevenDaysRolling() });
    const sloTwo = createSLO({ timeWindow: weeklyCalendarAligned() });
    const compositeSlo = createCompositeSLO({
      timeWindow: sevenDaysRolling(),
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid time window. Every source SLO must use the same time window as the composite.'
    );
  });

  it('throws when the time window duration is not the same accros all source SLOs', () => {
    const sloOne = createSLO({ timeWindow: sevenDaysRolling() });
    const sloTwo = createSLO({ timeWindow: thirtyDaysRolling() });
    const compositeSlo = createCompositeSLO({
      timeWindow: sevenDaysRolling(),
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid time window. Every source SLO must use the same time window as the composite.'
    );
  });

  it('throws when the budgeting method is not the same accros all source SLOs', () => {
    const sloOne = createSLO({ budgetingMethod: 'occurrences' });
    const sloTwo = createSLO({ budgetingMethod: 'timeslices' });
    const compositeSlo = createCompositeSLO({
      budgetingMethod: 'occurrences',
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid budgeting method. Every source SLO must use the same budgeting method as the composite.'
    );
  });

  it('throws when the timeslices window is not defined on the composite SLO', () => {
    const sloOne = createSLO({
      budgetingMethod: 'timeslices',
      objective: { target: 0.98, timesliceTarget: 0.95, timesliceWindow: fiveMinute() },
    });
    const sloTwo = createSLO({
      budgetingMethod: 'timeslices',
      objective: { target: 0.98, timesliceTarget: 0.95, timesliceWindow: fiveMinute() },
    });

    const compositeSlo = createCompositeSLO({
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.9,
      },
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid timeslices objective. A timeslice window must be set and equal to all source SLO.'
    );
  });

  it('throws when the timeslices window is not the same accros all source SLOs', () => {
    const sloOne = createSLO({
      budgetingMethod: 'timeslices',
      objective: { target: 0.98, timesliceTarget: 0.95, timesliceWindow: twoMinute() },
    });
    const sloTwo = createSLO({
      budgetingMethod: 'timeslices',
      objective: { target: 0.98, timesliceTarget: 0.95, timesliceWindow: fiveMinute() },
    });

    const compositeSlo = createCompositeSLO({
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.9,
        timesliceTarget: 0.95,
        timesliceWindow: fiveMinute(),
      },
      sources: [
        createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid budgeting method. Every source SLO must use the same timeslice window.'
    );
  });

  describe('happy flow', () => {
    it('throws nothing', () => {
      const sloOne = createSLO({
        budgetingMethod: 'occurrences',
        timeWindow: sevenDaysRolling(),
        revision: 2,
      });
      const sloTwo = createSLO({
        budgetingMethod: 'occurrences',
        timeWindow: sevenDaysRolling(),
        revision: 3,
      });
      const compositeSlo = createCompositeSLO({
        budgetingMethod: 'occurrences',
        timeWindow: sevenDaysRolling(),
        sources: [
          createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
          createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
        ],
      });

      expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).not.toThrow();
    });

    it('throws nothing in case of timeslices source SLOs', () => {
      const sloOne = createSLOWithTimeslicesBudgetingMethod();
      const sloTwo = createSLOWithTimeslicesBudgetingMethod();
      const compositeSlo = createCompositeSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.98,
          timesliceTarget: 0.95,
          timesliceWindow: twoMinute(),
        },
        timeWindow: sevenDaysRolling(),
        sources: [
          createWeightedAverageSource({ id: sloOne.id, revision: sloOne.revision }),
          createWeightedAverageSource({ id: sloTwo.id, revision: sloTwo.revision }),
        ],
      });

      expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).not.toThrow();
    });
  });
});
