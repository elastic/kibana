/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';

import dedent from 'dedent';

import { nextTick } from '@kbn/test-jest-helpers';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'test-engine' } },
}));

import { DOCUMENTS_API_JSON_EXAMPLE } from './constants';
import { DocumentCreationStep } from './types';

jest.mock('./utils', () => ({
  readUploadedFileAsText: jest.fn(),
}));
import { readUploadedFileAsText } from './utils';

import { DocumentCreationLogic } from '.';

describe('DocumentCreationLogic', () => {
  const { mount } = new LogicMounter(DocumentCreationLogic);
  const { http } = mockHttpValues;

  const DEFAULT_VALUES = {
    isDocumentCreationOpen: false,
    creationMode: 'api',
    activeJsonTab: 'uploadTab',
    creationStep: DocumentCreationStep.AddDocuments,
    textInput: dedent(DOCUMENTS_API_JSON_EXAMPLE),
    fileInput: null,
    isUploading: false,
    warnings: [],
    errors: [],
    summary: {},
  };
  const mockFile = new File(['mockFile'], 'mockFile.json');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(DocumentCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('showCreationModes', () => {
      beforeAll(() => {
        mount();
        DocumentCreationLogic.actions.showCreationModes();
      });

      const EXPECTED_VALUES = {
        ...DEFAULT_VALUES,
        isDocumentCreationOpen: true,
        creationStep: DocumentCreationStep.ShowCreationModes,
      };

      describe('isDocumentCreationOpen', () => {
        it('should be set to true', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            isDocumentCreationOpen: true,
          });
        });
      });

      describe('creationStep', () => {
        it('should be set to ShowCreationModes', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            creationStep: DocumentCreationStep.ShowCreationModes,
          });
        });
      });
    });

    describe('openDocumentCreation', () => {
      beforeAll(() => {
        mount();
        DocumentCreationLogic.actions.openDocumentCreation('api');
      });

      const EXPECTED_VALUES = {
        ...DEFAULT_VALUES,
        isDocumentCreationOpen: true,
        creationStep: DocumentCreationStep.AddDocuments,
        creationMode: 'api',
      };

      describe('isDocumentCreationOpen', () => {
        it('should be set to true', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            isDocumentCreationOpen: true,
          });
        });
      });

      describe('creationStep', () => {
        it('should be set to AddDocuments', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            creationStep: DocumentCreationStep.AddDocuments,
          });
        });
      });

      describe('creationMode', () => {
        it('should be set to the provided value', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            creationMode: 'api',
          });
        });
      });
    });

    describe('setActiveJsonTab', () => {
      beforeAll(() => {
        mount();
        DocumentCreationLogic.actions.setActiveJsonTab('pasteTab');
      });

      const EXPECTED_VALUES = {
        ...DEFAULT_VALUES,
        activeJsonTab: 'pasteTab',
      };

      describe('isDocumentCreationOpen', () => {
        it('should be set to "pasteTab"', () => {
          expect(DocumentCreationLogic.values).toEqual(EXPECTED_VALUES);
        });
      });
    });

    describe('closeDocumentCreation', () => {
      describe('isDocumentCreationOpen', () => {
        it('should be set to false', () => {
          mount();
          DocumentCreationLogic.actions.closeDocumentCreation();

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isDocumentCreationOpen: false,
          });
        });
      });

      describe('errors & warnings', () => {
        it('should be cleared', () => {
          mount({ errors: ['error'], warnings: ['warnings'] });
          DocumentCreationLogic.actions.closeDocumentCreation();

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            errors: [],
            warnings: [],
          });
        });
      });

      describe('textInput & fileInput', () => {
        it('should be reset to default values', () => {
          mount({ textInput: 'test', fileInput: mockFile });
          DocumentCreationLogic.actions.closeDocumentCreation();

          expect(DocumentCreationLogic.values).toEqual(DEFAULT_VALUES);
        });
      });
    });

    describe('setCreationStep', () => {
      describe('creationStep', () => {
        it('should be set to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.setCreationStep(DocumentCreationStep.ShowSummary);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            creationStep: 2,
          });
        });
      });
    });

    describe('setTextInput', () => {
      describe('textInput', () => {
        it('should be set to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.setTextInput('hello world');

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            textInput: 'hello world',
          });
        });
      });
    });

    describe('setFileInput', () => {
      describe('fileInput', () => {
        it('should be set to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.setFileInput(mockFile);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            fileInput: mockFile,
          });
        });
      });
    });

    describe('setWarnings', () => {
      describe('warnings', () => {
        it('should be set to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.setWarnings(['warning!']);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            warnings: ['warning!'],
          });
        });
      });
    });

    describe('setErrors', () => {
      describe('errors', () => {
        beforeAll(() => {
          mount();
        });

        it('should be set to the provided value', () => {
          DocumentCreationLogic.actions.setErrors(['error 1', 'error 2']);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            errors: ['error 1', 'error 2'],
          });
        });

        it('should gracefully array wrap single errors', () => {
          DocumentCreationLogic.actions.setErrors('error');

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            errors: ['error'],
          });
        });
      });

      describe('isUploading', () => {
        it('resets isUploading to false', () => {
          mount({ isUploading: true });
          DocumentCreationLogic.actions.setErrors(['error']);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            errors: ['error'],
            isUploading: false,
          });
        });
      });
    });

    describe('setSummary', () => {
      const mockSummary = {
        errors: [],
        validDocuments: {
          total: 1,
          examples: [{ foo: 'bar' }],
        },
        invalidDocuments: {
          total: 0,
          examples: [],
        },
        newSchemaFields: ['foo'],
      };

      describe('summary', () => {
        it('should be set to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.setSummary(mockSummary);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            summary: mockSummary,
          });
        });
      });

      describe('isUploading', () => {
        it('resets isUploading to false', () => {
          mount({ isUploading: true });
          DocumentCreationLogic.actions.setSummary(mockSummary);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            summary: mockSummary,
            isUploading: false,
          });
        });
      });
    });
  });

  describe('listeners', () => {
    describe('onSubmitFile', () => {
      describe('with a valid file', () => {
        beforeAll(() => {
          mount({ fileInput: mockFile });
          jest.spyOn(DocumentCreationLogic.actions, 'onSubmitJson').mockImplementation();
        });

        it('should read the text in the file and submit it as JSON', async () => {
          (readUploadedFileAsText as jest.Mock).mockReturnValue(Promise.resolve('some mock text'));
          await DocumentCreationLogic.actions.onSubmitFile();

          expect(DocumentCreationLogic.values.textInput).toEqual('some mock text');
          expect(DocumentCreationLogic.actions.onSubmitJson).toHaveBeenCalled();
        });

        it('should set isUploading to true', () => {
          DocumentCreationLogic.actions.onSubmitFile();

          expect(DocumentCreationLogic.values.isUploading).toEqual(true);
        });
      });

      describe('with an invalid file', () => {
        beforeAll(() => {
          mount({ fileInput: mockFile });
          jest.spyOn(DocumentCreationLogic.actions, 'onSubmitJson');
          jest.spyOn(DocumentCreationLogic.actions, 'setErrors');
        });

        it('should return an error', async () => {
          (readUploadedFileAsText as jest.Mock).mockReturnValue(Promise.reject());
          await DocumentCreationLogic.actions.onSubmitFile();

          expect(DocumentCreationLogic.actions.onSubmitJson).not.toHaveBeenCalled();
          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith([
            'Problem parsing file.',
          ]);
        });
      });

      describe('without a file', () => {
        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'onSubmitJson');
          jest.spyOn(DocumentCreationLogic.actions, 'setErrors');
        });

        it('should return an error', () => {
          DocumentCreationLogic.actions.onSubmitFile();

          expect(DocumentCreationLogic.actions.onSubmitJson).not.toHaveBeenCalled();
          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith(['No file found.']);
        });
      });
    });

    describe('onSubmitJson', () => {
      describe('with large JSON files', () => {
        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'uploadDocuments').mockImplementation();
          jest.spyOn(DocumentCreationLogic.actions, 'setWarnings');
        });

        it('should set a warning', () => {
          jest.spyOn(global.Buffer, 'byteLength').mockImplementation(() => 55000000); // 55MB
          DocumentCreationLogic.actions.onSubmitJson();

          expect(DocumentCreationLogic.actions.setWarnings).toHaveBeenCalledWith([
            expect.stringContaining("You're uploading an extremely large file"),
          ]);

          jest.restoreAllMocks();
        });
      });

      describe('with invalid JSON', () => {
        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'uploadDocuments').mockImplementation();
          jest.spyOn(DocumentCreationLogic.actions, 'setErrors');
        });

        it('should return malformed JSON errors', () => {
          DocumentCreationLogic.actions.setTextInput('invalid JSON');
          DocumentCreationLogic.actions.onSubmitJson();

          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith([
            'Unexpected token i in JSON at position 0',
          ]);
          expect(DocumentCreationLogic.actions.uploadDocuments).not.toHaveBeenCalled();
        });

        it('should error on non-array/object JSON', () => {
          DocumentCreationLogic.actions.setTextInput('null');
          DocumentCreationLogic.actions.onSubmitJson();

          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith([
            'Document contents must be a valid JSON array or object.',
          ]);
          expect(DocumentCreationLogic.actions.uploadDocuments).not.toHaveBeenCalled();
        });
      });

      describe('with valid JSON', () => {
        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'uploadDocuments').mockImplementation();
          jest.spyOn(DocumentCreationLogic.actions, 'setErrors');
        });

        it('should accept an array of JSON objs', () => {
          const mockJson = [{ foo: 'bar' }, { bar: 'baz' }];
          DocumentCreationLogic.actions.setTextInput('[{"foo":"bar"},{"bar":"baz"}]');
          DocumentCreationLogic.actions.onSubmitJson();

          expect(DocumentCreationLogic.actions.uploadDocuments).toHaveBeenCalledWith({
            documents: mockJson,
          });
          expect(DocumentCreationLogic.actions.setErrors).not.toHaveBeenCalled();
        });

        it('should accept a single JSON obj', () => {
          const mockJson = { foo: 'bar' };
          DocumentCreationLogic.actions.setTextInput('{"foo":"bar"}');
          DocumentCreationLogic.actions.onSubmitJson();

          expect(DocumentCreationLogic.actions.uploadDocuments).toHaveBeenCalledWith({
            documents: [mockJson],
          });
          expect(DocumentCreationLogic.actions.setErrors).not.toHaveBeenCalled();
        });
      });
    });

    describe('uploadDocuments', () => {
      describe('valid uploads', () => {
        const mockValidDocuments = [{ foo: 'bar', bar: 'baz', qux: 'quux' }];
        const mockValidResponse = {
          errors: [],
          validDocuments: { total: 3, examples: mockValidDocuments },
          invalidDocuments: { total: 0, examples: [] },
          newSchemaFields: ['foo', 'bar', 'qux'],
        };

        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'setSummary');
          jest.spyOn(DocumentCreationLogic.actions, 'setCreationStep');
        });

        it('should set and show summary from the returned response', async () => {
          http.post.mockReturnValueOnce(Promise.resolve(mockValidResponse));

          await DocumentCreationLogic.actions.uploadDocuments({ documents: mockValidDocuments });
          await nextTick();

          expect(DocumentCreationLogic.actions.setSummary).toHaveBeenCalledWith(mockValidResponse);
          expect(DocumentCreationLogic.actions.setCreationStep).toHaveBeenCalledWith(
            DocumentCreationStep.ShowSummary
          );
        });
      });

      describe('invalid uploads', () => {
        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'setErrors');
        });

        it('handles API errors', async () => {
          http.post.mockReturnValueOnce(
            Promise.reject({
              body: {
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid request payload JSON format',
              },
            })
          );

          await DocumentCreationLogic.actions.uploadDocuments({ documents: [{}] });
          await nextTick();

          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith(
            '[400 Bad Request] Invalid request payload JSON format'
          );
        });

        it('handles client-side errors', async () => {
          (http.post as jest.Mock).mockReturnValueOnce(new Error());

          await DocumentCreationLogic.actions.uploadDocuments({ documents: [{}] });
          await nextTick();

          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith(
            "Cannot read properties of undefined (reading 'total')"
          );
        });

        // NOTE: I can't seem to reproduce this in a production setting.
        it('handles errors returned from the API', async () => {
          http.post.mockReturnValueOnce(
            Promise.resolve({
              errors: ['JSON cannot be empty'],
            })
          );

          await DocumentCreationLogic.actions.uploadDocuments({ documents: [{}] });
          await nextTick();

          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith([
            'JSON cannot be empty',
          ]);
        });
      });

      describe('chunks large uploads', () => {
        // Using an array of #s for speed, it doesn't really matter what the contents of the documents are for this test
        const largeDocumentsArray = [...Array(200).keys()] as unknown as object[];

        const mockFirstResponse = {
          validDocuments: { total: 99, examples: largeDocumentsArray.slice(0, 98) },
          invalidDocuments: {
            total: 1,
            examples: [{ document: largeDocumentsArray[99], error: ['some error'] }],
          },
          newSchemaFields: ['foo', 'bar'],
        };
        const mockSecondResponse = {
          validDocuments: { total: 99, examples: largeDocumentsArray.slice(1, 99) },
          invalidDocuments: {
            total: 1,
            examples: [{ document: largeDocumentsArray[0], error: ['another error'] }],
          },
          newSchemaFields: ['bar', 'baz'],
        };

        beforeAll(() => {
          mount();
          jest.spyOn(DocumentCreationLogic.actions, 'setSummary');
          jest.spyOn(DocumentCreationLogic.actions, 'setErrors');
        });

        it('should correctly merge multiple API calls into a single summary obj', async () => {
          (http.post as jest.Mock)
            .mockReturnValueOnce(mockFirstResponse)
            .mockReturnValueOnce(mockSecondResponse);

          await DocumentCreationLogic.actions.uploadDocuments({ documents: largeDocumentsArray });
          await nextTick();

          expect(http.post).toHaveBeenCalledTimes(2);
          expect(DocumentCreationLogic.actions.setSummary).toHaveBeenCalledWith({
            errors: [],
            validDocuments: {
              total: 198,
              examples: largeDocumentsArray.slice(0, 5),
            },
            invalidDocuments: {
              total: 2,
              examples: [
                { document: largeDocumentsArray[99], error: ['some error'] },
                { document: largeDocumentsArray[0], error: ['another error'] },
              ],
            },
            newSchemaFields: ['foo', 'bar', 'baz'],
          });
        });

        it('should correctly merge response errors', async () => {
          (http.post as jest.Mock)
            .mockReturnValueOnce({ ...mockFirstResponse, errors: ['JSON cannot be empty'] })
            .mockReturnValueOnce({ ...mockSecondResponse, errors: ['Too large to render'] });

          await DocumentCreationLogic.actions.uploadDocuments({ documents: largeDocumentsArray });
          await nextTick();

          expect(http.post).toHaveBeenCalledTimes(2);
          expect(DocumentCreationLogic.actions.setErrors).toHaveBeenCalledWith([
            'JSON cannot be empty',
            'Too large to render',
          ]);
        });
      });
    });
  });
});
