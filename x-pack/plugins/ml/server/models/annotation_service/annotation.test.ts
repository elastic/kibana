/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getAnnotationsRequestMock from './__mocks__/get_annotations_request.json';
import getAnnotationsResponseMock from './__mocks__/get_annotations_response.json';

import { ANNOTATION_TYPE } from '../../../common/constants/annotations';
import { ML_ANNOTATIONS_INDEX_ALIAS_WRITE } from '../../../common/constants/index_patterns';
import { Annotation, isAnnotations } from '../../../common/types/annotations';

import { DeleteParams, GetResponse, IndexAnnotationArgs } from './annotation';
import { annotationServiceProvider } from './index';

const acknowledgedResponseMock = { acknowledged: true };

const jobIdMock = 'jobIdMock';

describe('annotation_service', () => {
  let mlClusterClientSpy = {} as any;

  beforeEach(() => {
    const callAs = jest.fn((action: string) => {
      switch (action) {
        case 'delete':
        case 'index':
          return Promise.resolve(acknowledgedResponseMock);
        case 'search':
          return Promise.resolve(getAnnotationsResponseMock);
      }
    });

    mlClusterClientSpy = {
      callAsCurrentUser: callAs,
      callAsInternalUser: callAs,
    };
  });

  describe('deleteAnnotation()', () => {
    it('should delete annotation', async (done) => {
      const { deleteAnnotation } = annotationServiceProvider(mlClusterClientSpy);
      const mockFunct = mlClusterClientSpy;

      const annotationMockId = 'mockId';
      const deleteParamsMock: DeleteParams = {
        index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
        id: annotationMockId,
        refresh: 'wait_for',
      };

      const response = await deleteAnnotation(annotationMockId);

      expect(mockFunct.callAsInternalUser.mock.calls[0][0]).toBe('delete');
      expect(mockFunct.callAsInternalUser.mock.calls[0][1]).toEqual(deleteParamsMock);
      expect(response).toBe(acknowledgedResponseMock);
      done();
    });
  });

  describe('getAnnotation()', () => {
    it('should get annotations for specific job', async (done) => {
      const { getAnnotations } = annotationServiceProvider(mlClusterClientSpy);
      const mockFunct = mlClusterClientSpy;

      const indexAnnotationArgsMock: IndexAnnotationArgs = {
        jobIds: [jobIdMock],
        earliestMs: 1454804100000,
        latestMs: 1455233399999,
        maxAnnotations: 500,
      };

      const response: GetResponse = await getAnnotations(indexAnnotationArgsMock);

      expect(mockFunct.callAsInternalUser.mock.calls[0][0]).toBe('search');
      expect(mockFunct.callAsInternalUser.mock.calls[0][1]).toEqual(getAnnotationsRequestMock);
      expect(Object.keys(response.annotations)).toHaveLength(1);
      expect(response.annotations[jobIdMock]).toHaveLength(2);
      expect(isAnnotations(response.annotations[jobIdMock])).toBeTruthy();
      done();
    });

    it('should throw and catch an error', async () => {
      const mockEsError = {
        statusCode: 404,
        error: 'Not Found',
        message: 'mock error message',
      };

      const mlClusterClientSpyError: any = {
        callAsInternalUser: jest.fn(() => {
          return Promise.resolve(mockEsError);
        }),
      };

      const { getAnnotations } = annotationServiceProvider(mlClusterClientSpyError);

      const indexAnnotationArgsMock: IndexAnnotationArgs = {
        jobIds: [jobIdMock],
        earliestMs: 1454804100000,
        latestMs: 1455233399999,
        maxAnnotations: 500,
      };

      await expect(getAnnotations(indexAnnotationArgsMock)).rejects.toEqual(
        Error(`Annotations couldn't be retrieved from Elasticsearch.`)
      );
    });
  });

  describe('indexAnnotation()', () => {
    it('should index annotation', async (done) => {
      const { indexAnnotation } = annotationServiceProvider(mlClusterClientSpy);
      const mockFunct = mlClusterClientSpy;

      const annotationMock: Annotation = {
        annotation: 'Annotation text',
        job_id: jobIdMock,
        timestamp: 1454804100000,
        type: ANNOTATION_TYPE.ANNOTATION,
      };
      const usernameMock = 'usernameMock';

      const response = await indexAnnotation(annotationMock, usernameMock);

      expect(mockFunct.callAsInternalUser.mock.calls[0][0]).toBe('index');

      // test if the annotation has been correctly augmented
      const indexParamsCheck = mockFunct.callAsInternalUser.mock.calls[0][1];
      const annotation = indexParamsCheck.body;
      expect(annotation.create_username).toBe(usernameMock);
      expect(annotation.modified_username).toBe(usernameMock);
      expect(typeof annotation.create_time).toBe('number');
      expect(typeof annotation.modified_time).toBe('number');

      expect(response).toBe(acknowledgedResponseMock);
      done();
    });

    it('should remove ._id and .key before updating annotation', async (done) => {
      const { indexAnnotation } = annotationServiceProvider(mlClusterClientSpy);
      const mockFunct = mlClusterClientSpy;

      const annotationMock: Annotation = {
        _id: 'mockId',
        annotation: 'Updated annotation text',
        job_id: jobIdMock,
        key: 'A',
        timestamp: 1454804100000,
        type: ANNOTATION_TYPE.ANNOTATION,
      };
      const usernameMock = 'usernameMock';

      const response = await indexAnnotation(annotationMock, usernameMock);

      expect(mockFunct.callAsInternalUser.mock.calls[0][0]).toBe('index');

      // test if the annotation has been correctly augmented
      const indexParamsCheck = mockFunct.callAsInternalUser.mock.calls[0][1];
      const annotation = indexParamsCheck.body;
      expect(annotation.create_username).toBe(usernameMock);
      expect(annotation.modified_username).toBe(usernameMock);
      expect(typeof annotation.create_time).toBe('number');
      expect(typeof annotation.modified_time).toBe('number');
      expect(typeof annotation._id).toBe('undefined');
      expect(typeof annotation.key).toBe('undefined');

      expect(response).toBe(acknowledgedResponseMock);
      done();
    });

    it('should update annotation text and the username for modified_username', async (done) => {
      const { getAnnotations, indexAnnotation } = annotationServiceProvider(mlClusterClientSpy);
      const mockFunct = mlClusterClientSpy;

      const indexAnnotationArgsMock: IndexAnnotationArgs = {
        jobIds: [jobIdMock],
        earliestMs: 1454804100000,
        latestMs: 1455233399999,
        maxAnnotations: 500,
      };

      const response: GetResponse = await getAnnotations(indexAnnotationArgsMock);

      const annotation: Annotation = response.annotations[jobIdMock][0];

      const originalUsernameMock = 'usernameMock';
      expect(annotation.create_username).toBe(originalUsernameMock);
      expect(annotation.modified_username).toBe(originalUsernameMock);

      const modifiedAnnotationText = 'Modified Annotation 1';
      annotation.annotation = modifiedAnnotationText;

      const modifiedUsernameMock = 'modifiedUsernameMock';

      await indexAnnotation(annotation, modifiedUsernameMock);

      expect(mockFunct.callAsInternalUser.mock.calls[1][0]).toBe('index');
      // test if the annotation has been correctly updated
      const indexParamsCheck = mockFunct.callAsInternalUser.mock.calls[1][1];
      const modifiedAnnotation = indexParamsCheck.body;
      expect(modifiedAnnotation.annotation).toBe(modifiedAnnotationText);
      expect(modifiedAnnotation.create_username).toBe(originalUsernameMock);
      expect(modifiedAnnotation.modified_username).toBe(modifiedUsernameMock);
      expect(typeof modifiedAnnotation.create_time).toBe('number');
      expect(typeof modifiedAnnotation.modified_time).toBe('number');
      done();
    });
  });
});
