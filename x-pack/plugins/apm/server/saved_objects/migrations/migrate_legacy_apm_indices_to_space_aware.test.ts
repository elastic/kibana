/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, Logger } from '@kbn/core/server';
import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { migrateLegacyAPMIndicesToSpaceAware } from './migrate_legacy_apm_indices_to_space_aware';

const loggerMock = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

describe('migrateLegacyAPMIndicesToSpaceAware', () => {
  describe('when legacy APM indices is not found', () => {
    const mockBulkCreate = jest.fn();
    const mockCreate = jest.fn();
    const mockFind = jest.fn();
    const core = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          get: () => {
            throw new Error('BOOM');
          },
          find: mockFind,
          bulkCreate: mockBulkCreate,
          create: mockCreate,
        }),
      },
    } as unknown as CoreStart;

    it('does not save any new saved object', () => {
      migrateLegacyAPMIndicesToSpaceAware({
        coreStart: core,
        logger: loggerMock,
      });
      expect(mockFind).not.toHaveBeenCalled();
      expect(mockBulkCreate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('when only default space is available', () => {
    const mockBulkCreate = jest.fn();
    const mockCreate = jest.fn();
    const mockSpaceFind = jest.fn().mockReturnValue({
      page: 1,
      per_page: 10000,
      total: 3,
      saved_objects: [
        {
          type: 'space',
          id: 'default',
          attributes: {
            name: 'Default',
          },
          references: [],
          migrationVersion: {
            space: '6.6.0',
          },
          coreMigrationVersion: '8.2.0',
          updated_at: '2022-02-22T14:13:28.839Z',
          version: 'WzI4OSwxXQ==',
          score: 0,
        },
      ],
    });
    const core = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 'apm-indices',
            type: 'apm-indices',
            namespaces: [],
            updated_at: '2022-02-22T14:17:10.584Z',
            version: 'WzE1OSwxXQ==',
            attributes: {
              apmIndices: {
                transaction: 'default-apm-*',
                span: 'default-apm-*',
                error: 'default-apm-*',
                metric: 'default-apm-*',
                sourcemap: 'default-apm-*',
                onboarding: 'default-apm-*',
              },
            },
            references: [],
            migrationVersion: {
              'apm-indices': '7.16.0',
            },
            coreMigrationVersion: '8.2.0',
          }),
          find: mockSpaceFind,
          bulkCreate: mockBulkCreate,
          create: mockCreate,
        }),
      },
    } as unknown as CoreStart;
    it('creates new default saved object with space awareness and delete legacy', async () => {
      await migrateLegacyAPMIndicesToSpaceAware({
        coreStart: core,
        logger: loggerMock,
      });
      expect(mockCreate).toBeCalledWith(
        APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
        {
          apmIndices: {
            transaction: 'default-apm-*',
            span: 'default-apm-*',
            error: 'default-apm-*',
            metric: 'default-apm-*',
            sourcemap: 'default-apm-*',
            onboarding: 'default-apm-*',
          },
          isSpaceAware: true,
        },
        {
          id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
          overwrite: true,
        }
      );
    });
  });

  describe('when multiple spaces are found', () => {
    const mockBulkCreate = jest.fn();
    const mockCreate = jest.fn();

    const savedObjects = [
      { id: 'default', name: 'Default' },
      { id: 'space-a', name: 'Space A' },
      { id: 'space-b', name: 'Space B' },
    ];
    const mockSpaceFind = jest.fn().mockReturnValue({
      page: 1,
      per_page: 10000,
      total: 3,
      saved_objects: savedObjects.map(({ id, name }) => {
        return {
          type: 'space',
          id,
          attributes: { name },
          references: [],
          migrationVersion: { space: '6.6.0' },
          coreMigrationVersion: '8.2.0',
          updated_at: '2022-02-22T14:13:28.839Z',
          version: 'WzI4OSwxXQ==',
          score: 0,
        };
      }),
    });
    const attributes = {
      apmIndices: {
        transaction: 'space-apm-*',
        span: 'space-apm-*',
        error: 'space-apm-*',
        metric: 'space-apm-*',
        sourcemap: 'space-apm-*',
        onboarding: 'space-apm-*',
      },
    };
    const core = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 'apm-indices',
            type: 'apm-indices',
            namespaces: [],
            updated_at: '2022-02-22T14:17:10.584Z',
            version: 'WzE1OSwxXQ==',
            attributes,
            references: [],
            migrationVersion: {
              'apm-indices': '7.16.0',
            },
            coreMigrationVersion: '8.2.0',
          }),
          find: mockSpaceFind,
          bulkCreate: mockBulkCreate,
          create: mockCreate,
        }),
      },
    } as unknown as CoreStart;
    it('creates multiple saved objects with space awareness and delete legacies', async () => {
      await migrateLegacyAPMIndicesToSpaceAware({
        coreStart: core,
        logger: loggerMock,
      });
      expect(mockCreate).toBeCalled();
      expect(mockBulkCreate).toBeCalledWith(
        savedObjects
          .filter(({ id }) => id !== 'default')
          .map(({ id }) => {
            return {
              type: APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
              id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
              initialNamespaces: [id],
              attributes: { ...attributes, isSpaceAware: true },
            };
          })
      );
    });
  });
});
