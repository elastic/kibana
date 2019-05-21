/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutoFollowPatternForm } from '../../public/app/components/auto_follow_pattern_form';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { AUTO_FOLLOW_PATTERN_EDIT } from './helpers/constants';

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

const { setup } = pageHelpers.autoFollowPatternEdit;
const { setup: setupAutoFollowPatternAdd } = pageHelpers.autoFollowPatternAdd;

describe('Edit Auto-follow pattern', () => {
  let server;
  let httpRequestsMockHelpers;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    let find;
    let component;

    const remoteClusters = [
      { name: 'cluster-1', seeds: ['localhost:123'], isConnected: true },
      { name: 'cluster-2', seeds: ['localhost:123'], isConnected: true },
    ];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
      httpRequestsMockHelpers.setGetAutoFollowPatternResponse(AUTO_FOLLOW_PATTERN_EDIT);
      ({ component, find } = setup());

      await nextTick();
      component.update();
    });

    /**
     * As the "edit" auto-follow pattern component uses the same form underneath that
     * the "create" auto-follow pattern, we won't test it again but simply make sure that
     * the form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<AutoFollowPatternAdd />" component', async () => {
      const { component: addAutofollowPatternComponent } = setupAutoFollowPatternAdd();

      await nextTick();
      addAutofollowPatternComponent.update();

      const formEdit = component.find(AutoFollowPatternForm);
      const formAdd = addAutofollowPatternComponent.find(AutoFollowPatternForm);

      expect(formEdit.length).toBe(1);
      expect(formAdd.length).toBe(1);
    });

    test('should populate the form fields with the values from the auto-follow pattern loaded', () => {
      expect(find('nameInput').props().value).toBe(AUTO_FOLLOW_PATTERN_EDIT.name);
      expect(find('remoteClusterInput').props().value).toBe(AUTO_FOLLOW_PATTERN_EDIT.remoteCluster);
      expect(find('indexPatternInput').text()).toBe(AUTO_FOLLOW_PATTERN_EDIT.leaderIndexPatterns.join(''));
      expect(find('prefixInput').props().value).toBe('prefix_');
      expect(find('suffixInput').props().value).toBe('_suffix');
    });
  });

  describe('when the remote cluster is disconnected', () => {
    let find;
    let exists;
    let component;
    let actions;
    let form;

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([{ name: 'cluster-2', seeds: ['localhost:123'], isConnected: false }]);
      httpRequestsMockHelpers.setGetAutoFollowPatternResponse(AUTO_FOLLOW_PATTERN_EDIT);
      ({ component, find, exists, actions, form } = setup());

      await nextTick();
      component.update();
    });

    test('should display an error and have a button to edit the remote cluster', () => {
      const error = find('notConnectedError');

      expect(error.length).toBe(1);
      expect(error.find('.euiCallOutHeader__title').text())
        .toBe(`Can't edit auto-follow pattern because remote cluster '${AUTO_FOLLOW_PATTERN_EDIT.remoteCluster}' is not connected`);
      expect(exists('notConnectedError.editButton')).toBe(true);
    });

    test('should prevent saving the form and display an error message for the required remote cluster', () => {
      actions.clickSaveForm();

      expect(form.getErrorsMessages()).toEqual(['A connected remote cluster is required.']);
      expect(find('submitButton').props().disabled).toBe(true);
    });
  });
});
