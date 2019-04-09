/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { nextTick } from '../../../../test_utils';
import { FollowerIndexAdd } from '../../public/app/sections/follower_index_add';
import { RemoteClustersFormField } from '../../public/app/components';

import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../src/legacy/ui/public/index_patterns';
import routing from '../../public/app/services/routing';

import { registerHttpRequestMockHelpers } from './test_helpers';
import { FollowerIndexFormPageObject } from './follower_index_form.page_object';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } =
    jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants');
  const { validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES } =
    jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/validate/validate_index_pattern');
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE, validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES };
});

describe('Create Follower index', () => {
  let followerIndexPage;
  let server;
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

    followerIndexPage = new FollowerIndexFormPageObject(FollowerIndexAdd, {}, {
      memoryRouter: {
        onRouter: (router) => routing.reactRouter = router
      }
    });
  });

  describe('on component mount', () => {
    test('should display a "loading remote clusters" indicator', () => {
      expect(followerIndexPage.getLoadingRemoteClusters().length).toBe(1);
      expect(followerIndexPage.getLoadingRemoteClusters().text()).toBe('Loading remote clusters…');
    });

    test('should have a link to the documentation', () => {
      expect(followerIndexPage.getDocsButton().length).toBe(1);
    });
  });

  describe('when remote clusters are loaded', () => {
    beforeEach(async () => {
      await nextTick(); // We need to wait next tick for the mock server response to comes in
      followerIndexPage.component.update();
    });

    test('should display the Follower index form', async () => {
      expect(followerIndexPage.getForm().length).toBe(1);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(followerIndexPage.getFormError().length).toBe(0);
      expect(followerIndexPage.getSaveFormButton().props().disabled).toBe(false);

      followerIndexPage.clickSave();

      expect(followerIndexPage.getFormError().length).toBe(1);
      expect(followerIndexPage.getFormErrorMessages()).toEqual([
        'Leader index is required.',
        'Name is required.'
      ]);
      expect(followerIndexPage.getSaveFormButton().props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      await nextTick(); // We need to wait next tick for the mock server response to comes in
      followerIndexPage.component.update();
    });

    describe('remote cluster', () => {
      // The implementation of the remote cluster "Select" + validation is
      // done inside the <RemoteClustersFormField /> component. The same component that we use in the <AutoFollowPatternAdd /> section.
      // To avoid copy/pasting the same tests here, we simply make sure that both sections use the <RemoteClustersFormField />
      test('uses a <RemoteClustersFormField /> component', async () => {
        // TODO: Create an AutoFollowPatternPageObject and compare against the RemoteClustersFormField
        // that it instantiates.
        const remoteClusterFormFieldFollowerIndex = followerIndexPage.component.find(RemoteClustersFormField);
        expect(remoteClusterFormFieldFollowerIndex.length).toBe(1);
      });
    });

    describe('leader index', () => {
      test('should not allow spaces', () => {
        followerIndexPage.setLeaderIndex('with space');
        followerIndexPage.clickSave();
        expect(followerIndexPage.getFormErrorMessages())
          .toContain('Spaces are not allowed in the leader index.');
      });

      test('should not allow invalid characters', () => {
        followerIndexPage.clickSave(); // Make all errors visible

        const expectInvalidChar = (char) => {
          followerIndexPage.setLeaderIndex(`with${char}`);
          expect(followerIndexPage.getFormErrorMessages())
            .toContain(`Remove the characters ${char} from your leader index.`);
        };

        return INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });
    });

    describe('follower index', () => {
      test('should not allow spaces', () => {
        followerIndexPage.setFollowerIndex('with space');
        followerIndexPage.clickSave();
        expect(followerIndexPage.getFormErrorMessages())
          .toContain('Spaces are not allowed in the name.');
      });

      test('should not allow a "." (period) as first character', () => {
        followerIndexPage.setFollowerIndex('.withDot');
        followerIndexPage.clickSave();
        expect(followerIndexPage.getFormErrorMessages())
          .toContain(`Name can't begin with a period.`);
      });

      test('should not allow invalid characters', () => {
        followerIndexPage.clickSave(); // Make all errors visible

        const expectInvalidChar = (char) => {
          followerIndexPage.setFollowerIndex(`with${char}`);
          expect(followerIndexPage.getFormErrorMessages())
            .toContain(`Remove the characters ${char} from your name.`);
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

          followerIndexPage.setFollowerIndex('index-name');
          await nextTick(550); // we need to wait as there is a debounce of 500ms on the http validation

          expect(server.requests.length).toBe(totalRequests + 1);
          expect(server.requests[server.requests.length - 1].url).toBe('/api/index_management/indices');
        });

        test('should display an error if the index already exists', async () => {
          const indexName = 'index-name';
          setGetClusterIndicesResponse([{ name: indexName }]);

          followerIndexPage.setFollowerIndex(indexName);
          await nextTick(550);
          followerIndexPage.component.update();

          expect(followerIndexPage.getFormErrorMessages())
            .toContain('An index with the same name already exists.');
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
            expect(followerIndexPage.find(testSubject).length).toBe(0);
          } catch {
            throw new Error(`The advanced field "${testSubject}"   .`);
          }
        };

        const expectDoesExist = (testSubject) => {
          try {
            expect(followerIndexPage.find(testSubject).length).toBe(1);
          } catch {
            throw new Error(`The advanced field "${testSubject}" does not exist.`);
          }
        };

        // Make sure no advanced settings is visible
        Object.keys(advancedSettingsInputFields).forEach(expectDoesNotExist);

        followerIndexPage.setAdvancedSettingsVisible();

        // Make sure all advanced settings are visible
        Object.keys(advancedSettingsInputFields).forEach(expectDoesExist);
      });

      test('should set the correct default value for each advanced setting', () => {
        followerIndexPage.setAdvancedSettingsVisible();

        Object.entries(advancedSettingsInputFields).forEach(([testSubject, data]) => {
          expect(followerIndexPage.find(testSubject).props().value).toBe(data.default);
        });
      });

      test('should set number input field for numeric advanced settings', () => {
        followerIndexPage.setAdvancedSettingsVisible();

        Object.entries(advancedSettingsInputFields).forEach(([testSubject, data]) => {
          if (data.type === 'number') {
            expect(followerIndexPage.find(testSubject).props().type).toBe('number');
          }
        });
      });
    });
  });
});
