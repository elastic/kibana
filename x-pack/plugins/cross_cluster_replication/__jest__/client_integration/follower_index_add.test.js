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

// import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../src/legacy/ui/public/index_patterns';
import routing from '../../public/app/services/routing';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  const { validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES } = jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/validate/validate_index_pattern'); // eslint-disable-line max-len
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
  let setLoadRemoteClusteresResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    ({
      setLoadRemoteClusteresResponse
    } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadRemoteClusteresResponse();

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
      ({ component, form, getUserActions, getFormErrorsMessages } = initTestBed(FollowerIndexAdd, undefined, testBedOptions));

      ({ clickSaveForm } = getUserActions('followerIndexForm'));

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    describe('remote cluster', () => {
      // The implementation of the remote cluster "Select" + validation is
      // done inside the <RemoteClustersFormField /> component. The same component that we use in the <AutoFollowPatternAdd /> section.
      // To avoid copy/pasting the same tests here, we simply make sure that both sections use the <RemoteClustersFormField />
      test('should use the same <RemoteClustersFormField /> component that in the <AutoFollowPatternAdd /> section', async () => {
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
    });
  });
});
