/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsFindOptions,
} from 'src/core/server';

import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../saved_object_types';

export const createMockSavedObjectsRepository = ({
  caseSavedObject = [],
  caseCommentSavedObject = [],
  caseConfigureSavedObject = [],
  caseMappingsSavedObject = [],
  caseUserActionsSavedObject = [],
}: {
  caseSavedObject?: any[];
  caseCommentSavedObject?: any[];
  caseConfigureSavedObject?: any[];
  caseMappingsSavedObject?: any[];
  caseUserActionsSavedObject?: any[];
} = {}) => {
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
            return {
              id,
              type,
              error: {
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [cases/not-exist] not found',
              },
            };
          }
          return result[0];
        }),
      };
    }),
    bulkCreate: jest.fn(),
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
      } else if (type === CASE_SAVED_OBJECT) {
        const result = caseSavedObject.filter((s) => s.id === id);
        if (!result.length) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        return result[0];
      } else {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
    }),
    find: jest.fn((findArgs: SavedObjectsFindOptions) => {
      // References can be an array so we need to loop through it looking for the bad-guy
      const hasReferenceIncludeBadGuy = (args: SavedObjectsFindOptions) => {
        const references = args.hasReference;
        if (references) {
          return Array.isArray(references)
            ? references.some((ref) => ref.id === 'bad-guy')
            : references.id === 'bad-guy';
        } else {
          return false;
        }
      };
      if (hasReferenceIncludeBadGuy(findArgs)) {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }

      if (
        (findArgs.type === CASE_CONFIGURE_SAVED_OBJECT &&
          caseConfigureSavedObject[0] &&
          caseConfigureSavedObject[0].id === 'throw-error-find') ||
        (findArgs.type === CASE_SAVED_OBJECT &&
          caseSavedObject[0] &&
          caseSavedObject[0].id === 'throw-error-find')
      ) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError('Error thrown for testing');
      }
      if (findArgs.type === CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT && caseMappingsSavedObject[0]) {
        return {
          page: 1,
          per_page: 5,
          total: 1,
          saved_objects: caseMappingsSavedObject,
        };
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

      // Currently not supporting sub cases in this mock library
      if (findArgs.type === SUB_CASE_SAVED_OBJECT) {
        return {
          page: 1,
          per_page: 0,
          total: 0,
          saved_objects: [],
        };
      }

      if (findArgs.type === CASE_USER_ACTION_SAVED_OBJECT) {
        return {
          page: 1,
          per_page: 5,
          total: caseUserActionsSavedObject.length,
          saved_objects: caseUserActionsSavedObject,
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
        attributes.connector.id === 'throw-error-create'
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
          version: attributes.connector.id === 'no-version' ? undefined : 'WzksMV0=',
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
        const foundComment = caseCommentSavedObject.findIndex((s: { id: string }) => s.id === id);
        if (foundComment === -1) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        const comment = caseCommentSavedObject[foundComment];
        caseCommentSavedObject.splice(foundComment, 1, {
          ...comment,
          id,
          type,
          updated_at: '2019-11-22T22:50:55.191Z',
          version: 'WzE3LDFd',
          attributes: {
            ...comment.attributes,
            ...attributes,
          },
        });
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
          version: attributes.connector?.id === 'no-version' ? undefined : 'WzE3LDFd',
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
