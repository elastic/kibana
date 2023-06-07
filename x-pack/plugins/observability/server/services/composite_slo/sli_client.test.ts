/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, toDurationUnit } from '../../domain/models';
import { SLIClient } from '../slo';
import { createSLO } from '../slo/fixtures/slo';
import { createSLIClientMock } from '../slo/mocks';
import { createCompositeSLO } from './fixtures/composite_slo';
import { DefaultCompositeSLIClient } from './sli_client';
import moment from 'moment';

const LONG_WINDOW = 'long_window';

describe('DefaultCompositeSLIClient', () => {
  let sliClientMock: jest.Mocked<SLIClient>;
  beforeEach(() => {
    sliClientMock = createSLIClientMock();
  });

  it('should throw exception when a source slo is missing', () => {
    const slo1 = createSLO();
    const slo2 = createSLO();
    const compositeSlo = createCompositeSLO({
      sources: [
        { id: slo1.id, revision: slo1.revision, weight: 3 },
        { id: slo2.id, revision: slo2.revision, weight: 1 },
      ],
    });
    const lookbackWindows = [
      { name: 'SHORT_WINDOW', duration: new Duration(1, toDurationUnit('h')) },
    ];
    const compositeSliClient = new DefaultCompositeSLIClient(sliClientMock);
    expect(compositeSliClient.fetchSLIDataFrom(compositeSlo, lookbackWindows)).rejects.toThrowError(
      `Composite SLO [${compositeSlo.id}] missing source SLO for ${slo1.id}`
    );
  });

  it('should return valid response', async () => {
    const slo1 = createSLO();
    const slo2 = createSLO();
    const compositeSlo = createCompositeSLO({
      sources: [
        { id: slo1.id, revision: slo1.revision, weight: 3, slo: slo1 },
        { id: slo2.id, revision: slo2.revision, weight: 1, slo: slo2 },
      ],
    });
    const lookbackWindows = [{ name: LONG_WINDOW, duration: new Duration(1, toDurationUnit('h')) }];
    const dateRange = { from: moment().subtract(1, 'h').toDate(), to: moment().toDate() };
    // Response for slo1
    sliClientMock.fetchSLIDataFrom.mockResolvedValueOnce({
      [LONG_WINDOW]: {
        dateRange,
        sli: 0.95,
      },
    });
    // Response for slo2
    sliClientMock.fetchSLIDataFrom.mockResolvedValueOnce({
      [LONG_WINDOW]: {
        dateRange,
        sli: 0.99,
      },
    });
    const compositeSliClient = new DefaultCompositeSLIClient(sliClientMock);
    const sliData = await compositeSliClient.fetchSLIDataFrom(compositeSlo, lookbackWindows);
    expect(sliData).toEqual({
      [LONG_WINDOW]: { dateRange, sli: 0.96 },
    });
  });
});
