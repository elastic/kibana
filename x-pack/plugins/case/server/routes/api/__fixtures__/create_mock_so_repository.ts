/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
} from 'src/core/server';

import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
} from '../../../saved_object_types';

export const createMockSavedObjectsRepository = ({
  caseSavedObject = [],
  caseCommentSavedObject = [],
  caseConfigureSavedObject = [],
}: {
  caseSavedObject?: any[];
  caseCommentSavedObject?: any[];
  caseConfigureSavedObject?: any[];
}) => {
  const mockSavedObjectsClientContract = ({
    bulkGet: jest.fn((objects: SavedObjectsBulkGetObject[]) => {
      return {
        saved_objects: objects.map(({ id, type }) => {
          if (type === CASE_COMMENT_SAVED_OBJECT) {
            const result = caseCommentSavedObject.filter((s) => s.id === id);
            if (!result.length) {
              throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
            }
            return result;
          }
          const result = caseSavedObject.filter((s) => s.id === id);
          if (!result.length) {
            throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
          }
          return result[0];
        }),
      };
    }),
    bulkUpdate: jest.fn((objects: Array<SavedObjectsBulkUpdateObject<unknown>>) => {
      return {
        saved_objects: objects.map(({ id, type, attributes }) => {
          if (type === CASE_COMMENT_SAVED_OBJECT) {
            if (!caseCommentSavedObject.find((s) => s.id === id)) {
              throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
            }
          } else if (type === CASE_SAVED_OBJECT) {
            if (!caseSavedObject.find((s) => s.id === id)) {
              throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
            }
          }

          return {
            id,
            type,
            updated_at: '2019-11-22T22:50:55.191Z',
            version: 'WzE3LDFd',
            attributes,
          };
        }),
      };
    }),
    get: jest.fn((type, id) => {
      if (type === CASE_COMMENT_SAVED_OBJECT) {
        const result = caseCommentSavedObject.filter((s) => s.id === id);
        if (!result.length) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        return result[0];
      }

      const result = caseSavedObject.filter((s) => s.id === id);
      if (!result.length) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return result[0];
    }),
    find: jest.fn((findArgs) => {
      if (findArgs.hasReference && findArgs.hasReference.id === 'bad-guy') {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }

      if (
        findArgs.type === CASE_CONFIGURE_SAVED_OBJECT &&
        caseConfigureSavedObject[0] &&
        caseConfigureSavedObject[0].id === 'throw-error-find'
      ) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError('Error thrown for testing');
      }

      if (findArgs.type === CASE_CONFIGURE_SAVED_OBJECT) {
        return {
          page: 1,
          per_page: 5,
          total: caseConfigureSavedObject.length,
          saved_objects: caseConfigureSavedObject,
        };
      }

      if (findArgs.type === CASE_COMMENT_SAVED_OBJECT) {
        return {
          page: 1,
          per_page: 5,
          total: caseCommentSavedObject.length,
          saved_objects: caseCommentSavedObject,
        };
      }
      return {
        page: 1,
        per_page: 5,
        total: caseSavedObject.length,
        saved_objects: caseSavedObject,
      };
    }),
    create: jest.fn((type, attributes, references) => {
      if (attributes.description === 'Throw an error' || attributes.comment === 'Throw an error') {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }

      if (
        type === CASE_CONFIGURE_SAVED_OBJECT &&
        attributes.connector_id === 'throw-error-create'
      ) {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }

      if (type === CASE_COMMENT_SAVED_OBJECT) {
        const newCommentObj = {
          type,
          id: 'mock-comment',
          attributes,
          ...references,
          updated_at: '2019-12-02T22:48:08.327Z',
          version: 'WzksMV0=',
        };
        caseCommentSavedObject = [...caseCommentSavedObject, newCommentObj];
        return newCommentObj;
      }

      if (type === CASE_CONFIGURE_SAVED_OBJECT) {
        const newConfiguration = {
          type,
          id: 'mock-configuration',
          attributes,
          updated_at: '2020-04-09T09:43:51.778Z',
          version: attributes.connector_id === 'no-version' ? undefined : 'WzksMV0=',
        };

        caseConfigureSavedObject = [newConfiguration];
        return newConfiguration;
      }

      return {
        type,
        id: 'mock-it',
        attributes,
        references: [],
        updated_at: '2019-12-02T22:48:08.327Z',
        version: 'WzksMV0=',
      };
    }),
    update: jest.fn((type, id, attributes) => {
      if (type === CASE_COMMENT_SAVED_OBJECT) {
        if (!caseCommentSavedObject.find((s) => s.id === id)) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        caseCommentSavedObject = [
          ...caseCommentSavedObject,
          {
            id,
            type,
            updated_at: '2019-11-22T22:50:55.191Z',
            version: 'WzE3LDFd',
            attributes,
          },
        ];
      } else if (type === CASE_SAVED_OBJECT) {
        if (!caseSavedObject.find((s) => s.id === id)) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
      }

      if (type === CASE_CONFIGURE_SAVED_OBJECT) {
        return {
          id,
          type,
          updated_at: '2019-11-22T22:50:55.191Z',
          attributes,
          version: attributes.connector_id === 'no-version' ? undefined : 'WzE3LDFd',
        };
      }

      return {
        id,
        type,
        updated_at: '2019-11-22T22:50:55.191Z',
        version: 'WzE3LDFd',
        attributes,
      };
    }),
    delete: jest.fn((type: string, id: string) => {
      let result = caseSavedObject.filter((s) => s.id === id);

      if (type === CASE_COMMENT_SAVED_OBJECT) {
        result = caseCommentSavedObject.filter((s) => s.id === id);
      }

      if (type === CASE_CONFIGURE_SAVED_OBJECT) {
        result = caseConfigureSavedObject.filter((s) => s.id === id);
      }

      if (type === CASE_COMMENT_SAVED_OBJECT && id === 'bad-guy') {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }

      if (!result.length) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }

      if (
        type === CASE_CONFIGURE_SAVED_OBJECT &&
        caseConfigureSavedObject[0].id === 'throw-error-delete'
      ) {
        throw new Error('Error thrown for testing');
      }
      return {};
    }),
    deleteByNamespace: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectsClientContract>;

  return mockSavedObjectsClientContract;
};
