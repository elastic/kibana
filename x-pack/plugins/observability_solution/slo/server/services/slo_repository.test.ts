/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { sloDefinitionSchema, sloSchema } from '@kbn/slo-schema';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { SLODefinition, StoredSLODefinition } from '../domain/models';
import { SLOIdConflict, SLONotFound } from '../errors';
import { SO_SLO_TYPE } from '../saved_objects';
import { aStoredSLO, createAPMTransactionDurationIndicator, createSLO } from './fixtures/slo';
import { KibanaSavedObjectsSLORepository } from './slo_repository';

const SOME_SLO = createSLO({ indicator: createAPMTransactionDurationIndicator() });
const ANOTHER_SLO = createSLO();
const INVALID_SLO_ID = 'invalid-slo-id';

function soFindResponse(
  sloList: SLODefinition[],
  includeInvalidStoredSLO: boolean = false
): SavedObjectsFindResponse<StoredSLODefinition> {
  return {
    page: 1,
    per_page: 25,
    total: includeInvalidStoredSLO ? sloList.length + 1 : sloList.length,
    // @ts-ignore invalid SLO is not following shape of StoredSLO
    saved_objects: [
      ...sloList.map((slo) => ({
        id: slo.id,
        attributes: sloDefinitionSchema.encode(slo),
        type: SO_SLO_TYPE,
        references: [],
        score: 1,
      })),
      ...(includeInvalidStoredSLO
        ? [
            {
              id: 'invalid-so-id',
              type: SO_SLO_TYPE,
              references: [],
              score: 1,
              attributes: { id: INVALID_SLO_ID, name: 'invalid' },
            },
          ]
        : []),
    ],
  };
}

describe('KibanaSavedObjectsSLORepository', () => {
  let loggerMock: jest.Mocked<MockedLogger>;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    soClientMock = savedObjectsClientMock.create();
  });

  describe('validation', () => {
    it('findById throws when an SLO is not found', async () => {
      soClientMock.find.mockResolvedValueOnce(soFindResponse([]));
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);

      await expect(repository.findById('inexistant-slo-id')).rejects.toThrowError(
        new SLONotFound('SLO [inexistant-slo-id] not found')
      );
    });

    it('deleteById throws when an SLO is not found', async () => {
      soClientMock.find.mockResolvedValueOnce(soFindResponse([]));
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);

      await expect(repository.deleteById('inexistant-slo-id')).rejects.toThrowError(
        new SLONotFound('SLO [inexistant-slo-id] not found')
      );
    });
  });

  describe('saving an SLO', () => {
    it('saves the new SLO', async () => {
      const slo = createSLO({ id: 'my-id' });
      soClientMock.find.mockResolvedValueOnce(soFindResponse([]));
      soClientMock.create.mockResolvedValueOnce(aStoredSLO(slo));
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);

      const savedSLO = await repository.save(slo);

      expect(savedSLO).toEqual(slo);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `slo.attributes.id:(${slo.id})`,
      });
      expect(soClientMock.create).toHaveBeenCalledWith(SO_SLO_TYPE, sloSchema.encode(slo), {
        id: undefined,
        overwrite: true,
      });
    });

    it('throws when the SLO id already exists and "throwOnConflict" is true', async () => {
      const slo = createSLO({ id: 'my-id' });
      soClientMock.find.mockResolvedValueOnce(soFindResponse([slo]));
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);

      await expect(repository.save(slo, { throwOnConflict: true })).rejects.toThrowError(
        new SLOIdConflict(`SLO [my-id] already exists`)
      );
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `slo.attributes.id:(${slo.id})`,
      });
    });

    it('updates the existing SLO', async () => {
      const slo = createSLO({ id: 'my-id' });
      soClientMock.find.mockResolvedValueOnce(soFindResponse([slo]));
      soClientMock.create.mockResolvedValueOnce(aStoredSLO(slo));
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);

      const savedSLO = await repository.save(slo);

      expect(savedSLO).toEqual(slo);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `slo.attributes.id:(${slo.id})`,
      });
      expect(soClientMock.create).toHaveBeenCalledWith(SO_SLO_TYPE, sloSchema.encode(slo), {
        id: 'my-id',
        overwrite: true,
      });
    });
  });

  describe('Find SLO', () => {
    it('finds an existing SLO', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(soFindResponse([SOME_SLO]));

      const foundSLO = await repository.findById(SOME_SLO.id);

      expect(foundSLO).toEqual(SOME_SLO);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `slo.attributes.id:(${SOME_SLO.id})`,
      });
    });

    it('throws and logs error on invalid stored SLO', async () => {
      const INCLUDE_INVALID_STORED_SLO = true;
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(soFindResponse([], INCLUDE_INVALID_STORED_SLO));

      await expect(repository.findById(INVALID_SLO_ID)).rejects.toThrowError(
        new Error('Invalid stored SLO')
      );

      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe('Find all SLO by ids', () => {
    it('returns the SLOs', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(soFindResponse([SOME_SLO, ANOTHER_SLO]));

      const results = await repository.findAllByIds([SOME_SLO.id, ANOTHER_SLO.id]);

      expect(results).toEqual([SOME_SLO, ANOTHER_SLO]);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 2,
        filter: `slo.attributes.id:(${SOME_SLO.id} or ${ANOTHER_SLO.id})`,
      });
    });

    it('handles invalid stored SLO by logging error', async () => {
      const INCLUDE_INVALID_STORED_SLO = true;
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(
        soFindResponse([SOME_SLO, ANOTHER_SLO], INCLUDE_INVALID_STORED_SLO)
      );

      const results = await repository.findAllByIds([SOME_SLO.id, INVALID_SLO_ID, ANOTHER_SLO.id]);

      expect(loggerMock.error).toHaveBeenCalled();
      expect(results).toEqual([SOME_SLO, ANOTHER_SLO]);
    });
  });

  it('deletes an SLO', async () => {
    const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
    soClientMock.find.mockResolvedValueOnce(soFindResponse([SOME_SLO]));

    await repository.deleteById(SOME_SLO.id);

    expect(soClientMock.find).toHaveBeenCalledWith({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${SOME_SLO.id})`,
    });
    expect(soClientMock.delete).toHaveBeenCalledWith(SO_SLO_TYPE, SOME_SLO.id);
  });

  describe('search', () => {
    it('searches by name', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(soFindResponse([SOME_SLO, ANOTHER_SLO]));

      const results = await repository.search(SOME_SLO.name, { page: 1, perPage: 100 });

      expect(results.results).toEqual([SOME_SLO, ANOTHER_SLO]);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 100,
        search: SOME_SLO.name,
        searchFields: ['name'],
      });
    });

    it('searches only the outdated ones', async () => {
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(soFindResponse([SOME_SLO, ANOTHER_SLO]));

      const results = await repository.search(
        SOME_SLO.name,
        { page: 1, perPage: 100 },
        { includeOutdatedOnly: true }
      );

      expect(results.results).toEqual([SOME_SLO, ANOTHER_SLO]);
      expect(soClientMock.find).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 100,
        search: SOME_SLO.name,
        searchFields: ['name'],
        filter: `slo.attributes.version < ${SLO_MODEL_VERSION}`,
      });
    });

    it('handles invalid stored SLO by logging error', async () => {
      const INCLUDE_INVALID_STORED_SLO = true;
      const repository = new KibanaSavedObjectsSLORepository(soClientMock, loggerMock);
      soClientMock.find.mockResolvedValueOnce(
        soFindResponse([SOME_SLO, ANOTHER_SLO], INCLUDE_INVALID_STORED_SLO)
      );

      const results = await repository.search('*', { page: 1, perPage: 100 });

      expect(loggerMock.error).toHaveBeenCalled();
      expect(results.results).toEqual([SOME_SLO, ANOTHER_SLO]);
    });
  });
});
