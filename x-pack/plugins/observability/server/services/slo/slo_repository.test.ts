/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common';
import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { SLO, sloSchema, StoredSLO } from '../../types/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { createAPMTransactionDurationIndicator, createSLO } from './fixtures/slo';
import { SLONotFound } from '../../errors';

const SOME_SLO = createSLO({ indicator: createAPMTransactionDurationIndicator() });

function aStoredSLO(slo: SLO): SavedObject<StoredSLO> {
  return {
    id: slo.id,
    attributes: sloSchema.encode(slo),
    type: SO_SLO_TYPE,
    references: [],
  };
}

function aFindResponse(slo: SLO): SavedObjectsFindResponse<StoredSLO> {
  return {
    page: 1,
    per_page: 25,
    total: 1,
    saved_objects: [
      {
        id: slo.id,
        attributes: sloSchema.encode(slo),
        type: SO_SLO_TYPE,
        references: [],
        score: 1,
      },
    ],
  };
}

describe('KibanaSavedObjectsSLORepository', () => {
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soClientMock = savedObjectsClientMock.create();
  });

  describe('validation', () => {
    it('findById throws when an SLO is not found', async () => {
      soClientMock.get.mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError());
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);

      await expect(repository.findById('inexistant-slo-id')).rejects.toThrowError(
        new SLONotFound('SLO [inexistant-slo-id] not found')
      );
    });

    it('deleteById throws when an SLO is not found', async () => {
      soClientMock.delete.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError()
      );
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);

      await expect(repository.deleteById('inexistant-slo-id')).rejects.toThrowError(
        new SLONotFound('SLO [inexistant-slo-id] not found')
      );
    });
  });

  it('saves the SLO', async () => {
    soClientMock.create.mockResolvedValueOnce(aStoredSLO(SOME_SLO));
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);

    const savedSLO = await repository.save(SOME_SLO);

    expect(savedSLO).toEqual(SOME_SLO);
    expect(soClientMock.create).toHaveBeenCalledWith(SO_SLO_TYPE, sloSchema.encode(SOME_SLO), {
      id: SOME_SLO.id,
      overwrite: true,
    });
  });

  it('finds an existing SLO', async () => {
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);
    soClientMock.get.mockResolvedValueOnce(aStoredSLO(SOME_SLO));

    const foundSLO = await repository.findById(SOME_SLO.id);

    expect(foundSLO).toEqual(SOME_SLO);
    expect(soClientMock.get).toHaveBeenCalledWith(SO_SLO_TYPE, SOME_SLO.id);
  });

  it('deletes an SLO', async () => {
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);

    await repository.deleteById(SOME_SLO.id);

    expect(soClientMock.delete).toHaveBeenCalledWith(SO_SLO_TYPE, SOME_SLO.id);
  });

  describe('find', () => {
    const DEFAULT_PAGINATION = { page: 1, perPage: 25 };

    it('includes the filter on name when provided', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(aFindResponse(SOME_SLO));

      const result = await repository.find({ nameFilter: 'availability' }, DEFAULT_PAGINATION);

      expect(result).toEqual({
        page: 1,
        perPage: 25,
        total: 1,
        results: [SOME_SLO],
      });
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 25,
        filter: `slo.attributes.name: availability`,
      });
    });

    it('does not include the filter when no criteria provided', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(aFindResponse(SOME_SLO));

      const result = await repository.find({}, DEFAULT_PAGINATION);

      expect(result).toEqual({
        page: 1,
        perPage: 25,
        total: 1,
        results: [SOME_SLO],
      });
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 25,
      });
    });
  });
});
