/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { compositeSloSchema } from '@kbn/slo-schema';

import { CompositeSLO, StoredCompositeSLO } from '../../domain/models';
import { CompositeSLOIdConflict, CompositeSLONotFound } from '../../errors';
import { SO_COMPOSITE_SLO_TYPE } from '../../saved_objects';
import { KibanaSavedObjectsCompositeSLORepository } from './composite_slo_repository';
import { aStoredCompositeSLO, createCompositeSLO } from './fixtures/composite_slo';

function createFindResponse(
  compositeSloList: CompositeSLO[]
): SavedObjectsFindResponse<StoredCompositeSLO> {
  return {
    page: 1,
    per_page: 25,
    total: compositeSloList.length,
    saved_objects: compositeSloList.map((compositeSlo) => ({
      id: compositeSlo.id,
      attributes: compositeSloSchema.encode(compositeSlo),
      type: SO_COMPOSITE_SLO_TYPE,
      references: [],
      score: 1,
    })),
  };
}

describe('KibanaSavedObjectsCompositeSLORepository', () => {
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soClientMock = savedObjectsClientMock.create();
  });

  describe('saving a composite SLO', () => {
    it('saves the new composite SLO', async () => {
      const compositeSlo = createCompositeSLO({ id: 'my-composite-id' });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([]));
      soClientMock.create.mockResolvedValueOnce(aStoredCompositeSLO(compositeSlo));
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);

      const savedCompositeSlo = await repository.save(compositeSlo);

      expect(savedCompositeSlo).toEqual(compositeSlo);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_COMPOSITE_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `composite-slo.attributes.id:(${compositeSlo.id})`,
      });
      expect(soClientMock.create).toHaveBeenCalledWith(
        SO_COMPOSITE_SLO_TYPE,
        compositeSloSchema.encode(compositeSlo),
        {
          id: undefined,
          overwrite: true,
        }
      );
    });

    it('throws when the Composite SLO id already exists and "throwOnConflict" is true', async () => {
      const compositeSlo = createCompositeSLO({ id: 'my-composite-id' });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([compositeSlo]));
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);

      await expect(repository.save(compositeSlo, { throwOnConflict: true })).rejects.toThrowError(
        new CompositeSLOIdConflict(`Composite SLO [${compositeSlo.id}] already exists`)
      );
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_COMPOSITE_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `composite-slo.attributes.id:(${compositeSlo.id})`,
      });
    });

    it('updates the existing composite SLO', async () => {
      const compositeSlo = createCompositeSLO({ id: 'my-composite-id' });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([compositeSlo]));
      soClientMock.create.mockResolvedValueOnce(aStoredCompositeSLO(compositeSlo));
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);

      const savedCompositeSLO = await repository.save(compositeSlo);

      expect(savedCompositeSLO).toEqual(compositeSlo);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_COMPOSITE_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `composite-slo.attributes.id:(${compositeSlo.id})`,
      });
      expect(soClientMock.create).toHaveBeenCalledWith(
        SO_COMPOSITE_SLO_TYPE,
        compositeSloSchema.encode(compositeSlo),
        {
          id: 'my-composite-id',
          overwrite: true,
        }
      );
    });
  });

  describe('deleting a composite SLO', () => {
    it('throws when not found', async () => {
      soClientMock.find.mockResolvedValueOnce(createFindResponse([]));
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);

      await expect(repository.deleteById('inexistant-slo-id')).rejects.toThrowError(
        new CompositeSLONotFound('Composite SLO [inexistant-slo-id] not found')
      );
    });

    it('deletes a composite SLO', async () => {
      const compositeSlo = createCompositeSLO({ id: 'my-composite-id' });
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([compositeSlo]));

      await repository.deleteById(compositeSlo.id);

      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_COMPOSITE_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `composite-slo.attributes.id:(${compositeSlo.id})`,
      });
      expect(soClientMock.delete).toHaveBeenCalledWith(SO_COMPOSITE_SLO_TYPE, compositeSlo.id);
    });
  });

  describe('finding a composite SLO', () => {
    it('finds an existing composite SLO', async () => {
      const compositeSlo = createCompositeSLO();
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([compositeSlo]));

      const foundSLO = await repository.findById(compositeSlo.id);
      expect(foundSLO).toEqual(compositeSlo);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_COMPOSITE_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `composite-slo.attributes.id:(${compositeSlo.id})`,
      });
    });

    it('throws when the composite SLO does not exist', async () => {
      const repository = new KibanaSavedObjectsCompositeSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([]));

      await expect(repository.findById('inexistant-id')).rejects.toThrowError(
        new CompositeSLONotFound('Composite SLO [inexistant-id] not found')
      );

      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_COMPOSITE_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: 'composite-slo.attributes.id:(inexistant-id)',
      });
    });
  });
});
