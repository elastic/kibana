/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatterns } from '@kbn/data-plugin/public';
import './mocks';
import { setupEnvironment, pageHelpers, nextTick, delay } from './helpers';
import { RemoteClustersFormField } from '../../app/components';

const { setup } = pageHelpers.followerIndexAdd;
const { setup: setupAutoFollowPatternAdd } = pageHelpers.autoFollowPatternAdd;

describe('Create Follower index', () => {
  let httpSetup;
  let httpRequestsMockHelpers;

  beforeAll(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadRemoteClustersResponse();
  });

  describe('on component mount', () => {
    let find;
    let exists;

    beforeEach(() => {
      ({ find, exists } = setup());
    });

    test('should display a "loading remote clusters" indicator', () => {
      expect(exists('remoteClustersLoading')).toBe(true);
      expect(find('remoteClustersLoading').text()).toBe('Loading remote clusters…');
    });
  });

  describe('when remote clusters are loaded', () => {
    let find;
    let exists;
    let component;
    let form;
    let actions;

    beforeEach(async () => {
      ({ find, exists, component, actions, form } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should have a link to the documentation', () => {
      expect(exists('docsButton')).toBe(true);
    });

    test('should display the Follower index form', async () => {
      expect(exists('followerIndexForm')).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(exists('formError')).toBe(false);
      expect(find('submitButton').props().disabled).toBe(false);

      actions.clickSaveForm();

      expect(exists('formError')).toBe(true);
      expect(form.getErrorsMessages()).toEqual(['Leader index is required.', 'Name is required.']);
      expect(find('submitButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    let find;
    let exists;
    let component;
    let form;
    let actions;

    beforeEach(async () => {
      ({ component, form, actions, exists, find } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    describe('remote cluster', () => {
      // The implementation of the remote cluster "Select" + validation is
      // done inside the <RemoteClustersFormField /> component. The same component that we use in the <AutoFollowPatternAdd /> section.
      // To avoid copy/pasting the same tests here, we simply make sure that both sections use the <RemoteClustersFormField />
      test('should use the same <RemoteClustersFormField /> component as the <AutoFollowPatternAdd /> section', async () => {
        const { component: autoFollowPatternAddComponent } = setupAutoFollowPatternAdd();
        await nextTick();
        autoFollowPatternAddComponent.update();

        const remoteClusterFormFieldFollowerIndex = component.find(RemoteClustersFormField);
        const remoteClusterFormFieldAutoFollowPattern =
          autoFollowPatternAddComponent.find(RemoteClustersFormField);

        expect(remoteClusterFormFieldFollowerIndex.length).toBe(1);
        expect(remoteClusterFormFieldAutoFollowPattern.length).toBe(1);
      });
    });

    describe('leader index', () => {
      test('should not allow spaces', () => {
        form.setInputValue('leaderIndexInput', 'with space');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the leader index.');
      });

      test('should not allow invalid characters', () => {
        actions.clickSaveForm(); // Make all errors visible

        const expectInvalidChar = (char) => {
          form.setInputValue('leaderIndexInput', `with${char}`);
          expect(form.getErrorsMessages()).toContain(
            `Remove the characters ${char} from your leader index.`
          );
        };

        return indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });
    });

    describe('follower index', () => {
      test('should not allow spaces', () => {
        form.setInputValue('followerIndexInput', 'with space');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should not allow a "." (period) as first character', () => {
        form.setInputValue('followerIndexInput', '.withDot');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain(`Name can't begin with a period.`);
      });

      test('should not allow invalid characters', () => {
        actions.clickSaveForm(); // Make all errors visible

        const expectInvalidChar = (char) => {
          form.setInputValue('followerIndexInput', `with${char}`);
          expect(form.getErrorsMessages()).toContain(
            `Remove the characters ${char} from your name.`
          );
        };

        return indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });

      describe('ES index name validation', () => {
        test('should make a request to check if the index name is available in ES', async () => {
          httpRequestsMockHelpers.setGetClusterIndicesResponse([]);

          form.setInputValue('followerIndexInput', 'index-name');
          await delay(550); // we need to wait as there is a debounce of 500ms on the http validation

          expect(httpSetup.get).toHaveBeenLastCalledWith(
            `/api/index_management/indices`,
            expect.anything()
          );
        });

        test('should display an error if the index already exists', async () => {
          const indexName = 'index-name';
          httpRequestsMockHelpers.setGetClusterIndicesResponse([{ name: indexName }]);

          form.setInputValue('followerIndexInput', indexName);
          await delay(550);
          component.update();

          expect(form.getErrorsMessages()).toContain('An index with the same name already exists.');
        });
      });
    });

    describe('advanced settings', () => {
      const advancedSettingsInputFields = {
        maxReadRequestOperationCountInput: {
          default: 5120,
          type: 'number',
        },
        maxOutstandingReadRequestsInput: {
          default: 12,
          type: 'number',
        },
        maxReadRequestSizeInput: {
          default: '32mb',
          type: 'string',
        },
        maxWriteRequestOperationCountInput: {
          default: 5120,
          type: 'number',
        },
        maxWriteRequestSizeInput: {
          default: '9223372036854775807b',
          type: 'string',
        },
        maxOutstandingWriteRequestsInput: {
          default: 9,
          type: 'number',
        },
        maxWriteBufferCountInput: {
          default: 2147483647,
          type: 'number',
        },
        maxWriteBufferSizeInput: {
          default: '512mb',
          type: 'string',
        },
        maxRetryDelayInput: {
          default: '500ms',
          type: 'string',
        },
        readPollTimeoutInput: {
          default: '1m',
          type: 'string',
        },
      };

      test('should have a toggle to activate advanced settings', () => {
        const expectDoesNotExist = (testSubject) => {
          try {
            expect(exists(testSubject)).toBe(false);
          } catch {
            throw new Error(`The advanced field "${testSubject}" exists.`);
          }
        };

        const expectDoesExist = (testSubject) => {
          try {
            expect(exists(testSubject)).toBe(true);
          } catch {
            throw new Error(`The advanced field "${testSubject}" does not exist.`);
          }
        };

        // Make sure no advanced settings is visible
        Object.keys(advancedSettingsInputFields).forEach(expectDoesNotExist);

        actions.toggleAdvancedSettings();

        // Make sure no advanced settings is visible
        Object.keys(advancedSettingsInputFields).forEach(expectDoesExist);
      });

      test('should set the correct default value for each advanced setting', () => {
        actions.toggleAdvancedSettings();

        Object.entries(advancedSettingsInputFields).forEach(([testSubject, data]) => {
          expect(find(testSubject).props().value).toBe(data.default);
        });
      });

      test('should set number input field for numeric advanced settings', () => {
        actions.toggleAdvancedSettings();

        Object.entries(advancedSettingsInputFields).forEach(([testSubject, data]) => {
          if (data.type === 'number') {
            expect(find(testSubject).props().type).toBe('number');
          }
        });
      });
    });
  });
});
