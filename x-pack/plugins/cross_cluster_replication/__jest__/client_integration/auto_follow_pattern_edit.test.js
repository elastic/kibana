/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, registerHttpRequestMockHelpers, nextTick, findTestSubject } from './test_helpers';
import { AutoFollowPatternAdd } from '../../public/app/sections/auto_follow_pattern_add';
import { AutoFollowPatternEdit } from '../../public/app/sections/auto_follow_pattern_edit';
import { AutoFollowPatternForm } from '../../public/app/components/auto_follow_pattern_form';
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

const AUTO_FOLLOW_PATTERN_NAME = 'my-autofollow';

const AUTO_FOLLOW_PATTERN = {
  name: AUTO_FOLLOW_PATTERN_NAME,
  remoteCluster: 'cluster-2',
  leaderIndexPatterns: ['my-pattern-*'],
  followIndexPattern: 'prefix_{{leader_index}}_suffix'
};

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => routing.reactRouter = router,
    // The auto-follow pattern id to fetch is read from the router ":id" param
    // so we first set it in our initial entries
    initialEntries: [`/${AUTO_FOLLOW_PATTERN_NAME}`],
    // and then we declarae the :id param on the component route path
    componentRoutePath: '/:id'
  }
};

describe('Edit Auto-follow pattern', () => {
  let server;
  let find;
  let component;
  let getUserActions;
  let getFormErrorsMessages;
  let clickSaveForm;
  let setLoadRemoteClustersResponse;
  let setGetAutoFollowPatternResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    ({
      setLoadRemoteClustersResponse,
      setGetAutoFollowPatternResponse
    } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadRemoteClustersResponse();

    // Mock all HTTP Requests that have not been handled previously
    server.respondWith([200, {}, '']);
  });

  describe('on component mount', () => {
    const remoteClusters = [
      { name: 'cluster-1', seeds: ['localhost:123'], isConnected: true },
      { name: 'cluster-2', seeds: ['localhost:123'], isConnected: true },
    ];

    beforeEach(async () => {
      setLoadRemoteClustersResponse(remoteClusters);
      setGetAutoFollowPatternResponse(AUTO_FOLLOW_PATTERN);
      ({ component, find } = initTestBed(AutoFollowPatternEdit, undefined, testBedOptions));

      await nextTick();
      component.update();
    });

    /**
     * As the "edit" auto-follow pattern component uses the same form underneath that
     * the "create" auto-follow pattern, we won't test it again but simply make sure that
     * the form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<AutoFollowPatternAdd />" component', async () => {
      const { component: addAutofollowPatternComponent } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions);

      await nextTick();
      addAutofollowPatternComponent.update();

      const formEdit = component.find(AutoFollowPatternForm);
      const formAdd = addAutofollowPatternComponent.find(AutoFollowPatternForm);

      expect(formEdit.length).toBe(1);
      expect(formAdd.length).toBe(1);
    });

    test('should populate the form fields with the values from the auto-follow pattern loaded', () => {
      expect(find('ccrAutoFollowPatternFormNameInput').props().value).toBe(AUTO_FOLLOW_PATTERN.name);
      expect(find('ccrRemoteClusterInput').props().value).toBe(AUTO_FOLLOW_PATTERN.remoteCluster);
      expect(find('ccrAutoFollowPatternFormIndexPatternInput').text()).toBe(AUTO_FOLLOW_PATTERN.leaderIndexPatterns.join(''));
      expect(find('ccrAutoFollowPatternFormPrefixInput').props().value).toBe('prefix_');
      expect(find('ccrAutoFollowPatternFormSuffixInput').props().value).toBe('_suffix');
    });
  });

  describe('when the remote cluster is disconnected', () => {
    beforeEach(async () => {
      setLoadRemoteClustersResponse([{ name: 'cluster-2', seeds: ['localhost:123'], isConnected: false }]);
      setGetAutoFollowPatternResponse(AUTO_FOLLOW_PATTERN);
      ({ component, find, getUserActions, getFormErrorsMessages } = initTestBed(AutoFollowPatternEdit, undefined, testBedOptions));
      ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

      await nextTick();
      component.update();
    });

    test('should display an error and have a button to edit the remote cluster', () => {
      const error = find('remoteClusterFieldCallOutError');

      expect(error.length).toBe(1);
      expect(error.find('.euiCallOutHeader__title').text())
        .toBe(`Can't edit auto-follow pattern because remote cluster '${AUTO_FOLLOW_PATTERN.remoteCluster}' is not connected`);
      expect(findTestSubject(error, 'ccrRemoteClusterEditButton').length).toBe(1);
    });

    test('should prevent saving the form and display an error message for the required remote cluster', () => {
      clickSaveForm();

      expect(getFormErrorsMessages()).toEqual(['A connected remote cluster is required.']);
      expect(find('ccrAutoFollowPatternFormSubmitButton').props().disabled).toBe(true);
    });
  });
});
