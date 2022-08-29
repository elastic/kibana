/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import uuid from 'uuid';

import { SLO } from '../../types/models';
import { KibanaSavedObjectsSloRepository } from './slo-repository';

const anSLO: SLO = {
  id: uuid.v1(),
  name: 'irrelevant',
  description: 'irrelevant',
  indicator: {
    type: 'slo.apm.transaction_duration',
    params: {
      environment: 'irrelevant',
      service: 'irrelevant',
      transaction_type: 'irrelevant',
      transaction_name: 'irrelevant',
      'threshold.us': 200000,
    },
  },
  time_window: {
    duration: '7d',
    is_rolling: true,
  },
  budgeting_method: 'occurrences',
  objective: {
    target: 0.999,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('sloRepository', () => {
  it('saves the SLO', async () => {
    const soClientMock = savedObjectsClientMock.create();
    const repository = new KibanaSavedObjectsSloRepository(soClientMock);

    const savedSLO = await repository.save(anSLO);

    expect(savedSLO).toEqual(anSLO);
    expect(soClientMock.create).toHaveBeenCalledWith(
      'slo',
      expect.objectContaining({
        ...anSLO,
      })
    );
  });

  it('finds an existing SLO', async () => {
    const soClientMock = savedObjectsClientMock.create();
    const repository = new KibanaSavedObjectsSloRepository(soClientMock);
    soClientMock.get.mockResolvedValueOnce({ attributes: anSLO } as SavedObject<SLO>);

    const foundSLO = await repository.findById(anSLO.id);

    expect(foundSLO).toEqual(anSLO);
    expect(soClientMock.get).toHaveBeenCalledWith('slo', anSLO.id);
  });
});
