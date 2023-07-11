/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FILE_SIZE } from '../../common/constants';
import { createMockFilesSetup } from '@kbn/files-plugin/public/mocks';
import { registerCaseFileKinds } from '.';
import type { FilesConfig } from './types';

describe('ui files index', () => {
  describe('registerCaseFileKinds', () => {
    const mockFilesSetup = createMockFilesSetup();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('allowedMimeTypes', () => {
      const config: FilesConfig = {
        allowedMimeTypes: ['abc'],
        maxSize: undefined,
      };

      beforeEach(() => {
        registerCaseFileKinds(config, mockFilesSetup);
      });

      it('sets cases allowed mime types to abc', () => {
        expect(mockFilesSetup.registerFileKind.mock.calls[0][0].allowedMimeTypes).toEqual(['abc']);
      });

      it('sets observability allowed mime types to abc', () => {
        expect(mockFilesSetup.registerFileKind.mock.calls[1][0].allowedMimeTypes).toEqual(['abc']);
      });

      it('sets securitySolution allowed mime types to 100 mb', () => {
        expect(mockFilesSetup.registerFileKind.mock.calls[2][0].allowedMimeTypes).toEqual(['abc']);
      });
    });

    describe('max file size', () => {
      describe('default max file size', () => {
        const config: FilesConfig = {
          allowedMimeTypes: [],
          maxSize: undefined,
        };

        beforeEach(() => {
          registerCaseFileKinds(config, mockFilesSetup);
        });

        it('sets cases max file size to 100 mb', () => {
          expect(mockFilesSetup.registerFileKind.mock.calls[0][0].maxSizeBytes).toEqual(
            MAX_FILE_SIZE
          );
        });

        it('sets observability max file size to 100 mb', () => {
          expect(mockFilesSetup.registerFileKind.mock.calls[1][0].maxSizeBytes).toEqual(
            MAX_FILE_SIZE
          );
        });

        it('sets securitySolution max file size to 100 mb', () => {
          expect(mockFilesSetup.registerFileKind.mock.calls[2][0].maxSizeBytes).toEqual(
            MAX_FILE_SIZE
          );
        });
      });

      describe('custom file size', () => {
        const config: FilesConfig = {
          allowedMimeTypes: [],
          maxSize: 5,
        };

        beforeEach(() => {
          registerCaseFileKinds(config, mockFilesSetup);
        });

        it('sets cases max file size to 5', () => {
          expect(mockFilesSetup.registerFileKind.mock.calls[0][0].maxSizeBytes).toEqual(5);
        });

        it('sets observability max file size to 5', () => {
          expect(mockFilesSetup.registerFileKind.mock.calls[1][0].maxSizeBytes).toEqual(5);
        });

        it('sets securitySolution max file size to 5', () => {
          expect(mockFilesSetup.registerFileKind.mock.calls[2][0].maxSizeBytes).toEqual(5);
        });
      });
    });
  });
});
