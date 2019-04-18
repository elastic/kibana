/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, registerHttpRequestMockHelpers, nextTick } from './test_helpers';
import { FollowerIndexAdd } from '../../public/app/sections/follower_index_add';
import { AutoFollowPatternAdd } from '../../public/app/sections/auto_follow_pattern_add';
import { RemoteClustersFormField } from '../../public/app/components';

import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../src/legacy/ui/public/index_patterns';
import routing from '../../public/app/services/routing';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
  getInjected: (key) => {
    if (key === 'uiCapabilities') {
      return {
        navLinks: {},
        management: {},
        catalogue: {}
      };
    }
  }
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } =
    jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants');
  const { validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES } =
    jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/validate/validate_index_pattern');
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE, validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES };
});

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => routing.reactRouter = router
  }
};

describe('Create Follower index', () => {
  let server;
  let find;
  let exists;
  let component;
  let getUserActions;
  let form;
  let getFormErrorsMessages;
  let clickSaveForm;
  let toggleAdvancedSettings;
  let setLoadRemoteClustersResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    ({
      setLoadRemoteClustersResponse,
    } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadRemoteClustersResponse();

    // Mock all HTTP Requests that have not been handled previously
    server.respondWith([200, {}, '']);
  });

  describe('on component mount', () => {
    beforeEach(() => {
      ({ find, exists } = initTestBed(FollowerIndexAdd, undefined, testBedOptions));
    });

    test('should display a "loading remote clusters" indicator', () => {
      expect(exists('remoteClustersLoading')).toBe(true);
      expect(find('remoteClustersLoading').text()).toBe('Loading remote clusters…');
    });

    test('should have a link to the documentation', () => {
      expect(exists('followerIndexDocsButton')).toBe(true);
    });
  });

  describe('when remote clusters are loaded', () => {
    beforeEach(async () => {
      ({ find, exists, component, getUserActions, getFormErrorsMessages } = initTestBed(FollowerIndexAdd, undefined, testBedOptions));

      ({ clickSaveForm } = getUserActions('followerIndexForm'));

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display the Follower index form', async () => {
      expect(exists('ccrFollowerIndexForm')).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(exists('followerIndexFormError')).toBe(false);
      expect(find('ccrFollowerIndexFormSubmitButton').props().disabled).toBe(false);

      clickSaveForm();

      expect(exists('followerIndexFormError')).toBe(true);
      expect(getFormErrorsMessages()).toEqual([
        'Leader index is required.',
        'Name is required.'
      ]);
      expect(find('ccrFollowerIndexFormSubmitButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      ({ component, form, getUserActions, getFormErrorsMessages, exists, find } = initTestBed(FollowerIndexAdd, undefined, testBedOptions));

      ({ clickSaveForm, toggleAdvancedSettings } = getUserActions('followerIndexForm'));

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    describe('remote cluster', () => {
      // The implementation of the remote cluster "Select" + validation is
      // done inside the <RemoteClustersFormField /> component. The same component that we use in the <AutoFollowPatternAdd /> section.
      // To avoid copy/pasting the same tests here, we simply make sure that both sections use the <RemoteClustersFormField />
      test('should use the same <RemoteClustersFormField /> component as the <AutoFollowPatternAdd /> section', async () => {
        const { component: autoFollowPatternAddComponent } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions);
        await nextTick();
        autoFollowPatternAddComponent.update();

        const remoteClusterFormFieldFollowerIndex = component.find(RemoteClustersFormField);
        const remoteClusterFormFieldAutoFollowPattern = autoFollowPatternAddComponent.find(RemoteClustersFormField);

        expect(remoteClusterFormFieldFollowerIndex.length).toBe(1);
        expect(remoteClusterFormFieldAutoFollowPattern.length).toBe(1);
      });
    });

    describe('leader index', () => {
      test('should not allow spaces', () => {
        form.setInputValue('ccrFollowerIndexFormLeaderIndexInput', 'with space');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain('Spaces are not allowed in the leader index.');
      });

      test('should not allow invalid characters', () => {
        clickSaveForm(); // Make all errors visible

        const expectInvalidChar = (char) => {
          form.setInputValue('ccrFollowerIndexFormLeaderIndexInput', `with${char}`);
          expect(getFormErrorsMessages()).toContain(`Remove the characters ${char} from your leader index.`);
        };

        return INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });
    });

    describe('follower index', () => {
      test('should not allow spaces', () => {
        form.setInputValue('ccrFollowerIndexFormFollowerIndexInput', 'with space');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should not allow a "." (period) as first character', () => {
        form.setInputValue('ccrFollowerIndexFormFollowerIndexInput', '.withDot');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain(`Name can't begin with a period.`);
      });

      test('should not allow invalid characters', () => {
        clickSaveForm(); // Make all errors visible

        const expectInvalidChar = (char) => {
          form.setInputValue('ccrFollowerIndexFormFollowerIndexInput', `with${char}`);
          expect(getFormErrorsMessages()).toContain(`Remove the characters ${char} from your name.`);
        };

        return INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });

      describe('ES index name validation', () => {
        let setGetClusterIndicesResponse;
        beforeEach(() => {
          ({ setGetClusterIndicesResponse } = registerHttpRequestMockHelpers(server));
        });

        test('should make a request to check if the index name is available in ES', async () => {
          setGetClusterIndicesResponse([]);

          // Keep track of the request count made until this point
          const totalRequests = server.requests.length;

          form.setInputValue('ccrFollowerIndexFormFollowerIndexInput', 'index-name');
          await nextTick(550); // we need to wait as there is a debounce of 500ms on the http validation

          expect(server.requests.length).toBe(totalRequests + 1);
          expect(server.requests[server.requests.length - 1].url).toBe('/api/index_management/indices');
        });

        test('should display an error if the index already exists', async () => {
          const indexName = 'index-name';
          setGetClusterIndicesResponse([{ name: indexName }]);

          form.setInputValue('ccrFollowerIndexFormFollowerIndexInput', indexName);
          await nextTick(550);
          component.update();

          expect(getFormErrorsMessages()).toContain('An index with the same name already exists.');
        });
      });
    });

    describe('advanced settings', () => {
      const advancedSettingsInputFields = {
        ccrFollowerIndexFormMaxReadRequestOperationCountInput: {
          default: 5120,
          type: 'number',
        },
        ccrFollowerIndexFormMaxOutstandingReadRequestsInput: {
          default: 12,
          type: 'number',
        },
        ccrFollowerIndexFormMaxReadRequestSizeInput: {
          default: '32mb',
          type: 'string',
        },
        ccrFollowerIndexFormMaxWriteRequestOperationCountInput: {
          default: 5120,
          type: 'number',
        },
        ccrFollowerIndexFormMaxWriteRequestSizeInput: {
          default: '9223372036854775807b',
          type: 'string',
        },
        ccrFollowerIndexFormMaxOutstandingWriteRequestsInput: {
          default: 9,
          type: 'number',
        },
        ccrFollowerIndexFormMaxWriteBufferCountInput: {
          default: 2147483647,
          type: 'number',
        },
        ccrFollowerIndexFormMaxWriteBufferSizeInput: {
          default: '512mb',
          type: 'string',
        },
        ccrFollowerIndexFormMaxRetryDelayInput: {
          default: '500ms',
          type: 'string',
        },
        ccrFollowerIndexFormReadPollTimeoutInput: {
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

        toggleAdvancedSettings();

        // Make sure no advanced settings is visible
        Object.keys(advancedSettingsInputFields).forEach(expectDoesExist);
      });

      test('should set the correct default value for each advanced setting', () => {
        toggleAdvancedSettings();

        Object.entries(advancedSettingsInputFields).forEach(([testSubject, data]) => {
          expect(find(testSubject).props().value).toBe(data.default);
        });
      });

      test('should set number input field for numeric advanced settings', () => {
        toggleAdvancedSettings();

        Object.entries(advancedSettingsInputFields).forEach(([testSubject, data]) => {
          if (data.type === 'number') {
            expect(find(testSubject).props().type).toBe('number');
          }
        });
      });
    });
  });
});
