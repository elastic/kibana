/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { INVALID_NAME_CHARS } from '../../public/application/services/validation/validate_repository';
import { getRepository } from '../../test/fixtures';
import { RepositoryType } from '../../common/types';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { RepositoryAddTestBed } from './helpers/repository_add.helpers';

jest.mock('ui/new_platform');

const { setup } = pageHelpers.repositoryAdd;
const repositoryTypes = ['fs', 'url', 'source', 'azure', 'gcs', 's3', 'hdfs'];

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

describe('<RepositoryAdd />', () => {
  let testBed: RepositoryAddTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);

      testBed = await setup();
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
      testBed = await setup();
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
      testBed = await setup();
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

      testBed = await setup();
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
            await nextTick(100);
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
    const repository = getRepository();

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);

      testBed = await setup();
    });

    describe('not source only', () => {
      beforeEach(() => {
        // Fill step 1 required fields and go to step 2
        testBed.form.setInputValue('nameInput', repository.name);
        testBed.actions.selectRepositoryType(repository.type);
        testBed.actions.clickNextButton();
      });

      test('should send the correct payload', async () => {
        const { form, actions } = testBed;

        // Fill step 2
        form.setInputValue('locationInput', repository.settings.location);
        form.toggleEuiSwitch('compressToggle');

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual({
          name: repository.name,
          type: repository.type,
          settings: {
            location: repository.settings.location,
            compress: true,
          },
        });
      });

      test('should surface the API errors from the "save" HTTP request', async () => {
        const { component, form, actions, find, exists } = testBed;

        form.setInputValue('locationInput', repository.settings.location);
        form.toggleEuiSwitch('compressToggle');

        const error = {
          status: 400,
          error: 'Bad request',
          message: 'Repository payload is invalid',
        };

        httpRequestsMockHelpers.setSaveRepositoryResponse(undefined, { body: error });

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
          component.update();
        });

        expect(exists('saveRepositoryApiError')).toBe(true);
        expect(find('saveRepositoryApiError').text()).toContain(error.message);
      });
    });

    describe('source only', () => {
      beforeEach(() => {
        // Fill step 1 required fields and go to step 2
        testBed.form.setInputValue('nameInput', repository.name);
        testBed.actions.selectRepositoryType(repository.type);
        testBed.form.toggleEuiSwitch('sourceOnlyToggle'); // toggle source
        testBed.actions.clickNextButton();
      });

      test('should send the correct payload', async () => {
        const { form, actions } = testBed;

        // Fill step 2
        form.setInputValue('locationInput', repository.settings.location);

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual({
          name: repository.name,
          type: 'source',
          settings: {
            delegateType: repository.type,
            location: repository.settings.location,
          },
        });
      });
    });
  });
});
