/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { INVALID_NAME_CHARS } from '../../public/application/services/validation/validate_repository';
import { API_BASE_PATH } from '../../common';
import { getRepository } from '../../test/fixtures';
import { RepositoryType } from '../../common/types';
import { setupEnvironment, pageHelpers, nextTick, delay } from './helpers';
import { RepositoryAddTestBed } from './helpers/repository_add.helpers';

const { setup } = pageHelpers.repositoryAdd;
const repositoryTypes = ['fs', 'url', 'source', 'azure', 'gcs', 's3', 'hdfs'];

describe('<RepositoryAdd />', () => {
  let testBed: RepositoryAddTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);

      testBed = await setup(httpSetup);
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Register repository');
    });

    /**
     * TODO: investigate why we need to skip this test.
     * My guess is a change in the useRequest() hook and maybe a setTimout() that hasn't been
     * mocked with jest.useFakeTimers();
     * I tested locally and the loading spinner is present in the UI so skipping this test for now.
     */
    test.skip('should indicate that the repository types are loading', () => {
      const { exists, find } = testBed;
      expect(exists('sectionLoading')).toBe(true);
      expect(find('sectionLoading').text()).toBe('Loading repository types…');
    });

    test('should not let the user go to the next step if some fields are missing', () => {
      const { form, actions } = testBed;

      actions.clickNextButton();

      expect(form.getErrorsMessages()).toEqual([
        'Repository name is required.',
        'Type is required.',
      ]);
    });
  });

  describe('when no repository types are not found', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse([]);
      testBed = await setup(httpSetup);
      await nextTick();
      testBed.component.update();
    });

    test('should show an error callout  ', async () => {
      const { find, exists } = testBed;

      expect(exists('noRepositoryTypesError')).toBe(true);
      expect(find('noRepositoryTypesError').text()).toContain('No repository types available');
    });
  });

  describe('when repository types are found', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);
      testBed = await setup(httpSetup);
      await nextTick();
      testBed.component.update();
    });

    test('should have 1 card for each repository type', () => {
      const { exists } = testBed;

      repositoryTypes.forEach((type) => {
        const testSubject: any = `${type}RepositoryType`;
        try {
          expect(exists(testSubject)).toBe(true);
        } catch {
          throw new Error(`Repository type "${type}" was not found.`);
        }
      });
    });
  });

  describe('form validations', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);

      testBed = await setup(httpSetup);
      await nextTick();
      testBed.component.update();
    });

    describe('name (step 1)', () => {
      it('should not allow spaces in the name', () => {
        const { form, actions } = testBed;
        form.setInputValue('nameInput', 'with space');

        actions.clickNextButton();

        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      it('should not allow invalid characters', () => {
        const { form, actions } = testBed;

        const expectErrorForChar = (char: string) => {
          form.setInputValue('nameInput', `with${char}`);
          actions.clickNextButton();

          try {
            expect(form.getErrorsMessages()).toContain(
              `Character "${char}" is not allowed in the name.`
            );
          } catch {
            throw new Error(`Invalid character ${char} did not display an error.`);
          }
        };

        INVALID_NAME_CHARS.forEach(expectErrorForChar);
      });
    });

    describe('settings (step 2)', () => {
      const typeToErrorMessagesMap: Record<string, string[]> = {
        fs: ['Location is required.'],
        url: ['URL is required.'],
        s3: ['Bucket is required.'],
        gcs: ['Bucket is required.'],
        hdfs: ['URI is required.'],
      };

      test('should validate required repository settings', async () => {
        const { component, actions, form } = testBed;

        form.setInputValue('nameInput', 'my-repo');

        const selectRepoTypeAndExpectErrors = async (type: RepositoryType) => {
          actions.selectRepositoryType(type);
          actions.clickNextButton();

          await act(async () => {
            actions.clickSubmitButton();
            await nextTick();
            component.update();
          });

          const expectedErrors = typeToErrorMessagesMap[type];
          const errorsFound = form.getErrorsMessages();

          expectedErrors.forEach((error) => {
            try {
              expect(errorsFound).toContain(error);
            } catch {
              throw new Error(
                `Expected "${error}" not found in form. Got "${JSON.stringify(errorsFound)}"`
              );
            }
          });

          await act(async () => {
            actions.clickBackButton();
            await delay(100);
            component.update();
          });
        };

        await selectRepoTypeAndExpectErrors('fs');
        await selectRepoTypeAndExpectErrors('url');
        await selectRepoTypeAndExpectErrors('s3');
        await selectRepoTypeAndExpectErrors('gcs');
        await selectRepoTypeAndExpectErrors('hdfs');
      });
    });
  });

  describe('form payload & api errors', () => {
    const fsRepository = getRepository({ settings: {
      chunkSize: '10mb',
      location: '/tmp/es-backups',
      maxSnapshotBytesPerSec: '1g',
      maxRestoreBytesPerSec: '1g',
    }});

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);

      testBed = await setup(httpSetup);
    });

    describe('not source only', () => {
      test('should send the correct payload for FS repository', async () => {
        const { form, actions, component } = testBed;

        // Fill step 1 required fields and go to step 2
        form.setInputValue('nameInput', fsRepository.name);
        actions.selectRepositoryType(fsRepository.type);
        actions.clickNextButton();

        // Fill step 2
        form.setInputValue('locationInput', fsRepository.settings.location);
        form.toggleEuiSwitch('compressToggle');
        form.setInputValue('chunkSizeInput', fsRepository.settings.chunkSize);
        form.setInputValue('maxSnapshotBytesInput', fsRepository.settings.maxSnapshotBytesPerSec);
        form.setInputValue('maxRestoreBytesInput', fsRepository.settings.maxRestoreBytesPerSec);
        form.toggleEuiSwitch('readOnlyToggle');

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({ body: JSON.stringify({
            name: fsRepository.name,
            type: fsRepository.type,
            settings: {
              location: fsRepository.settings.location,
              compress: true,
              chunkSize: fsRepository.settings.chunkSize,
              maxSnapshotBytesPerSec: fsRepository.settings.maxSnapshotBytesPerSec,
              maxRestoreBytesPerSec: fsRepository.settings.maxRestoreBytesPerSec,
              readonly: true,
            },
          })})
        );
      });

      test('should send the correct payload for Azure repository', async () => {
        const azureRepository = getRepository({
          type: 'azure',
          settings: {
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
            client: 'client',
            container: 'container',
            basePath: 'path',
          },
        });

        const { form, actions, component } = testBed;

        // Fill step 1 required fields and go to step 2
        form.setInputValue('nameInput', azureRepository.name);
        actions.selectRepositoryType(azureRepository.type);
        actions.clickNextButton();

        // Fill step 2
        form.setInputValue('clientInput', azureRepository.settings.client);
        form.setInputValue('containerInput', azureRepository.settings.container);
        form.setInputValue('basePathInput', azureRepository.settings.basePath);
        form.toggleEuiSwitch('compressToggle');
        form.setInputValue('chunkSizeInput', azureRepository.settings.chunkSize);
        form.setInputValue(
          'maxSnapshotBytesInput',
          azureRepository.settings.maxSnapshotBytesPerSec
        );
        form.setInputValue('maxRestoreBytesInput', azureRepository.settings.maxRestoreBytesPerSec);
        form.toggleEuiSwitch('readOnlyToggle');

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({ body: JSON.stringify({
            name: azureRepository.name,
            type: azureRepository.type,
            settings: {
              client: azureRepository.settings.client,
              container: azureRepository.settings.container,
              basePath: azureRepository.settings.basePath,
              compress: false,
              chunkSize: azureRepository.settings.chunkSize,
              maxSnapshotBytesPerSec: azureRepository.settings.maxSnapshotBytesPerSec,
              maxRestoreBytesPerSec: azureRepository.settings.maxRestoreBytesPerSec,
              readonly: true,
            },
          })})
        );
      });

      test('should send the correct payload for GCS repository', async () => {
        const gcsRepository = getRepository({
          type: 'gcs',
          settings: {
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
            client: 'test_client',
            bucket: 'test_bucket',
            basePath: 'test_path',
          },
        });

        const { form, actions, component } = testBed;

        // Fill step 1 required fields and go to step 2
        form.setInputValue('nameInput', gcsRepository.name);
        actions.selectRepositoryType(gcsRepository.type);
        actions.clickNextButton();

        // Fill step 2
        form.setInputValue('clientInput', gcsRepository.settings.client);
        form.setInputValue('bucketInput', gcsRepository.settings.bucket);
        form.setInputValue('basePathInput', gcsRepository.settings.basePath);
        form.toggleEuiSwitch('compressToggle');
        form.setInputValue('chunkSizeInput', gcsRepository.settings.chunkSize);
        form.setInputValue('maxSnapshotBytesInput', gcsRepository.settings.maxSnapshotBytesPerSec);
        form.setInputValue('maxRestoreBytesInput', gcsRepository.settings.maxRestoreBytesPerSec);
        form.toggleEuiSwitch('readOnlyToggle');

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({ body: JSON.stringify({
            name: gcsRepository.name,
            type: gcsRepository.type,
            settings: {
              client: gcsRepository.settings.client,
              bucket: gcsRepository.settings.bucket,
              basePath: gcsRepository.settings.basePath,
              compress: false,
              chunkSize: gcsRepository.settings.chunkSize,
              maxSnapshotBytesPerSec: gcsRepository.settings.maxSnapshotBytesPerSec,
              maxRestoreBytesPerSec: gcsRepository.settings.maxRestoreBytesPerSec,
              readonly: true,
            },
          })})
        );
      });

      test('should send the correct payload for HDFS repository', async () => {
        const hdfsRepository = getRepository({
          type: 'hdfs',
          settings: {
            uri: 'uri',
            path: 'test_path',
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
          },
        });

        const { form, actions, component } = testBed;

        // Fill step 1 required fields and go to step 2
        form.setInputValue('nameInput', hdfsRepository.name);
        actions.selectRepositoryType(hdfsRepository.type);
        actions.clickNextButton();

        // Fill step 2
        form.setInputValue('uriInput', hdfsRepository.settings.uri);
        form.setInputValue('pathInput', hdfsRepository.settings.path);
        form.toggleEuiSwitch('compressToggle');
        form.setInputValue('chunkSizeInput', hdfsRepository.settings.chunkSize);
        form.setInputValue('maxSnapshotBytesInput', hdfsRepository.settings.maxSnapshotBytesPerSec);
        form.setInputValue('maxRestoreBytesInput', hdfsRepository.settings.maxRestoreBytesPerSec);
        form.toggleEuiSwitch('readOnlyToggle');

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({ body: JSON.stringify({
            name: hdfsRepository.name,
            type: hdfsRepository.type,
            settings: {
              uri: `hdfs://${hdfsRepository.settings.uri}`,
              path: hdfsRepository.settings.path,
              compress: false,
              chunkSize: hdfsRepository.settings.chunkSize,
              maxSnapshotBytesPerSec: hdfsRepository.settings.maxSnapshotBytesPerSec,
              maxRestoreBytesPerSec: hdfsRepository.settings.maxRestoreBytesPerSec,
              readonly: true,
            },
          })})
        );
      });

      test('should send the correct payload for S3 repository', async () => {
        const { form, actions, component } = testBed;

        const s3Repository = getRepository({
          type: 's3',
          settings: {
            bucket: 'test_bucket',
            client: 'test_client',
            basePath: 'test_path',
            bufferSize: '1g',
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
          },
        });

        // Fill step 1 required fields and go to step 2
        form.setInputValue('nameInput', s3Repository.name);
        actions.selectRepositoryType(s3Repository.type);
        actions.clickNextButton();

        // Fill step 2
        form.setInputValue('bucketInput', s3Repository.settings.bucket);
        form.setInputValue('clientInput', s3Repository.settings.client);
        form.setInputValue('basePathInput', s3Repository.settings.basePath);
        form.setInputValue('bufferSizeInput', s3Repository.settings.bufferSize);
        form.toggleEuiSwitch('compressToggle');
        form.setInputValue('chunkSizeInput', s3Repository.settings.chunkSize);
        form.setInputValue('maxSnapshotBytesInput', s3Repository.settings.maxSnapshotBytesPerSec);
        form.setInputValue('maxRestoreBytesInput', s3Repository.settings.maxRestoreBytesPerSec);
        form.toggleEuiSwitch('readOnlyToggle');

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({ body: JSON.stringify({
            name: s3Repository.name,
            type: s3Repository.type,
            settings: {
              bucket: s3Repository.settings.bucket,
              client: s3Repository.settings.client,
              basePath: s3Repository.settings.basePath,
              bufferSize: s3Repository.settings.bufferSize,
              compress: false,
              chunkSize: s3Repository.settings.chunkSize,
              maxSnapshotBytesPerSec: s3Repository.settings.maxSnapshotBytesPerSec,
              maxRestoreBytesPerSec: s3Repository.settings.maxRestoreBytesPerSec,
              readonly: true,
            },
          })})
        );
      });

      test('should surface the API errors from the "save" HTTP request', async () => {
        const { component, form, actions, find, exists } = testBed;

        // Fill step 1 required fields and go to step 2
        form.setInputValue('nameInput', fsRepository.name);
        actions.selectRepositoryType(fsRepository.type);
        actions.clickNextButton();

        // Fill step 2
        form.setInputValue('locationInput', fsRepository.settings.location);
        form.toggleEuiSwitch('compressToggle');

        const error = {
          statusCode: 400,
          error: 'Bad request',
          message: 'Repository payload is invalid',
        };

        httpRequestsMockHelpers.setSaveRepositoryResponse(undefined, error);

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(exists('saveRepositoryApiError')).toBe(true);
        expect(find('saveRepositoryApiError').text()).toContain(error.message);
      });
    });

    describe('source only', () => {
      beforeEach(() => {
        // Fill step 1 required fields and go to step 2
        testBed.form.setInputValue('nameInput', fsRepository.name);
        testBed.actions.selectRepositoryType(fsRepository.type);
        testBed.form.toggleEuiSwitch('sourceOnlyToggle'); // toggle source
        testBed.actions.clickNextButton();
      });

      test('should send the correct payload', async () => {
        const { form, actions, component } = testBed;

        // Fill step 2
        form.setInputValue('locationInput', fsRepository.settings.location);

        await act(async () => {
          actions.clickSubmitButton();
        });

        component.update();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({ body: JSON.stringify({
            name: fsRepository.name,
            type: 'source',
            settings: {
              delegateType: fsRepository.type,
              location: fsRepository.settings.location,
            },
          })})
        );
      });
    });
  });
});
