/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { SLO, StoredSLO } from '../../types/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { createSLO } from './fixtures/slo';

const anSLO = createSLO({
  type: 'slo.apm.transaction_duration',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transaction_type: 'irrelevant',
    transaction_name: 'irrelevant',
    'threshold.us': 200000,
  },
});

function aStoredSLO(slo: SLO): SavedObject<StoredSLO> {
  return {
    id: slo.id,
    attributes: {
      ...slo,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    type: SO_SLO_TYPE,
    references: [],
  };
}

describe('sloRepository', () => {
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soClientMock = savedObjectsClientMock.create();
  });

  it('saves the SLO', async () => {
    soClientMock.create.mockResolvedValueOnce(aStoredSLO(anSLO));
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);

    const savedSLO = await repository.save(anSLO);

    expect(savedSLO).toEqual(anSLO);
    expect(soClientMock.create).toHaveBeenCalledWith(
      SO_SLO_TYPE,
      expect.objectContaining({
        ...anSLO,
        updated_at: expect.anything(),
        created_at: expect.anything(),
      })
    );
  });

  it('finds an existing SLO', async () => {
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);
    soClientMock.get.mockResolvedValueOnce(aStoredSLO(anSLO));

    const foundSLO = await repository.findById(anSLO.id);

    expect(foundSLO).toEqual(anSLO);
    expect(soClientMock.get).toHaveBeenCalledWith(SO_SLO_TYPE, anSLO.id);
  });
});
