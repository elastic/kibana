/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createWeightedSourceSlo,
  createCompositeSLO,
} from '../../../services/composite_slo/fixtures/composite_slo';
import { createSLO } from '../../../services/slo/fixtures/slo';
import {
  sevenDaysRolling,
  thirtyDaysRolling,
  weeklyCalendarAligned,
} from '../../../services/slo/fixtures/time_window';
import { validateCompositeSLO } from './validate_composite_slo';

describe('validateCompositeSLO', () => {
  it("throws when specified combined SLOs don't match the actual SLO revision", () => {
    const sloOne = createSLO({ revision: 3 });
    const sloTwo = createSLO({ revision: 2 });
    const compositeSlo = createCompositeSLO({
      combinedSlos: [
        createWeightedSourceSlo({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedSourceSlo({ id: sloTwo.id, revision: 1 }),
      ],
    });
    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'One or many combined SLOs are not matching the specified id and revision.'
    );
  });

  it('throws when specified combined SLOs refers to a non-existant SLO', () => {
    const sloOne = createSLO({ revision: 3 });
    const compositeSlo = createCompositeSLO({
      combinedSlos: [
        createWeightedSourceSlo({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedSourceSlo({ id: 'non-existant' }),
      ],
    });
    expect(() => validateCompositeSLO(compositeSlo, [sloOne])).toThrowError(
      'One or many combined SLOs are not matching the specified id and revision.'
    );
  });

  it('throws when the time window is not the same accros all combined SLOs', () => {
    const sloOne = createSLO({ timeWindow: sevenDaysRolling() });
    const sloTwo = createSLO({ timeWindow: weeklyCalendarAligned() });
    const compositeSlo = createCompositeSLO({
      timeWindow: sevenDaysRolling(),
      combinedSlos: [
        createWeightedSourceSlo({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedSourceSlo({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid time window. Every SLO must use the same time window as the composite.'
    );
  });

  it('throws when the time window duration is not the same accros all combined SLOs', () => {
    const sloOne = createSLO({ timeWindow: sevenDaysRolling() });
    const sloTwo = createSLO({ timeWindow: thirtyDaysRolling() });
    const compositeSlo = createCompositeSLO({
      timeWindow: sevenDaysRolling(),
      combinedSlos: [
        createWeightedSourceSlo({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedSourceSlo({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid time window. Every SLO must use the same time window as the composite.'
    );
  });

  it('throws when the budgeting method is not the same accros all combined SLOs', () => {
    const sloOne = createSLO({ budgetingMethod: 'occurrences' });
    const sloTwo = createSLO({ budgetingMethod: 'timeslices' });
    const compositeSlo = createCompositeSLO({
      budgetingMethod: 'occurrences',
      combinedSlos: [
        createWeightedSourceSlo({ id: sloOne.id, revision: sloOne.revision }),
        createWeightedSourceSlo({ id: sloTwo.id, revision: sloTwo.revision }),
      ],
    });

    expect(() => validateCompositeSLO(compositeSlo, [sloOne, sloTwo])).toThrowError(
      'Invalid budgeting method. Every SLO must use the same budgeting method as the composite.'
    );
  });
});
