/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { sloSchema } from '@kbn/slo-schema';

import { SLO, StoredSLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import {
  KibanaSavedObjectsSLORepository,
  Pagination,
  Sort,
  SortDirection,
  SortField,
} from './slo_repository';
import { createAPMTransactionDurationIndicator, createSLO, aStoredSLO } from './fixtures/slo';
import { SLONotFound } from '../../errors';

const SOME_SLO = createSLO({ indicator: createAPMTransactionDurationIndicator() });
const ANOTHER_SLO = createSLO();

function createFindResponse(sloList: SLO[]): SavedObjectsFindResponse<StoredSLO> {
  return {
    page: 1,
    per_page: 25,
    total: sloList.length,
    saved_objects: sloList.map((slo) => ({
      id: slo.id,
      attributes: sloSchema.encode(slo),
      type: SO_SLO_TYPE,
      references: [],
      score: 1,
    })),
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

  it('finds all SLOs by ids', async () => {
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);
    soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO, ANOTHER_SLO]));

    const results = await repository.findAllByIds([SOME_SLO.id, ANOTHER_SLO.id]);

    expect(results).toEqual([SOME_SLO, ANOTHER_SLO]);
    expect(soClientMock.find).toHaveBeenCalledWith({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 2,
      filter: `slo.attributes.id:(${SOME_SLO.id} or ${ANOTHER_SLO.id})`,
    });
  });

  it('deletes an SLO', async () => {
    const repository = new KibanaSavedObjectsSLORepository(soClientMock);

    await repository.deleteById(SOME_SLO.id);

    expect(soClientMock.delete).toHaveBeenCalledWith(SO_SLO_TYPE, SOME_SLO.id);
  });

  describe('find', () => {
    const DEFAULT_PAGINATION: Pagination = { page: 1, perPage: 25 };
    const DEFAULT_SORTING: Sort = {
      field: SortField.Name,
      direction: SortDirection.Asc,
    };

    describe('Name filter', () => {
      it('includes the filter on name with wildcard when provided', async () => {
        const repository = new KibanaSavedObjectsSLORepository(soClientMock);
        soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

        const result = await repository.find(
          { name: 'availability*' },
          DEFAULT_SORTING,
          DEFAULT_PAGINATION
        );

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
          filter: `(slo.attributes.name: *availability*)`,
          sortField: 'name',
          sortOrder: 'asc',
        });
      });

      it('includes the filter on name with added wildcard when not provided', async () => {
        const repository = new KibanaSavedObjectsSLORepository(soClientMock);
        soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

        const result = await repository.find(
          { name: 'availa' },
          DEFAULT_SORTING,
          DEFAULT_PAGINATION
        );

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
          filter: `(slo.attributes.name: *availa*)`,
          sortField: 'name',
          sortOrder: 'asc',
        });
      });
    });

    describe('indicatorTypes filter', () => {
      it('includes the filter on indicator types when provided', async () => {
        const repository = new KibanaSavedObjectsSLORepository(soClientMock);
        soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

        const result = await repository.find(
          { indicatorTypes: ['sli.kql.custom'] },
          DEFAULT_SORTING,
          DEFAULT_PAGINATION
        );

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
          filter: `(slo.attributes.indicator.type: sli.kql.custom)`,
          sortField: 'name',
          sortOrder: 'asc',
        });
      });

      it('includes the filter on indicator types as logical OR when provided', async () => {
        const repository = new KibanaSavedObjectsSLORepository(soClientMock);
        soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

        const result = await repository.find(
          { indicatorTypes: ['sli.kql.custom', 'sli.apm.transactionDuration'] },
          DEFAULT_SORTING,
          DEFAULT_PAGINATION
        );

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
          filter: `(slo.attributes.indicator.type: sli.kql.custom or slo.attributes.indicator.type: sli.apm.transactionDuration)`,
          sortField: 'name',
          sortOrder: 'asc',
        });
      });
    });

    it('includes filter on name and indicator types', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

      const result = await repository.find(
        { name: 'latency', indicatorTypes: ['sli.kql.custom', 'sli.apm.transactionDuration'] },
        DEFAULT_SORTING,
        DEFAULT_PAGINATION
      );

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
        filter: `(slo.attributes.name: *latency*) and (slo.attributes.indicator.type: sli.kql.custom or slo.attributes.indicator.type: sli.apm.transactionDuration)`,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    it('does not include the filter when no criteria provided', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

      const result = await repository.find({}, DEFAULT_SORTING, DEFAULT_PAGINATION);

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
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    it('sorts by name ascending', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

      await repository.find({}, DEFAULT_SORTING, DEFAULT_PAGINATION);

      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 25,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    it('sorts by name descending', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

      await repository.find(
        {},
        { field: SortField.Name, direction: SortDirection.Desc },
        DEFAULT_PAGINATION
      );

      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 25,
        sortField: 'name',
        sortOrder: 'desc',
      });
    });

    it('sorts by indicator type', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock);
      soClientMock.find.mockResolvedValueOnce(createFindResponse([SOME_SLO]));

      await repository.find(
        {},
        { field: SortField.IndicatorType, direction: SortDirection.Asc },
        DEFAULT_PAGINATION
      );

      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 25,
        sortField: 'indicator.type',
        sortOrder: 'asc',
      });
    });
  });
});
