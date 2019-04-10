/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { nextTick } from '../../../../test_utils';
import { FollowerIndexAdd } from '../../public/app/sections/follower_index_add';
// import { RemoteClustersFormField } from '../../public/app/components';

// import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../src/legacy/ui/public/index_patterns';
import routing from '../../public/app/services/routing';

import { registerHttpRequestMockHelpers } from './test_helpers';
import { setup } from './follower_index_form.page_object_v2';

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
  let server;
  let setLoadRemoteClustersResponse;
  let exists;
  let find;
  let component;
  let form;
  let actions;

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

    ({ component, exists, find, form, actions } = setup(FollowerIndexAdd, {}, {
      memoryRouter: {
        onRouter: (router) => routing.reactRouter = router
      }
    }));
  });

  describe('on component mount', () => {
    test('should display a "loading remote clusters" indicator', () => {
      expect(exists('loadingRemoteClusters')).toBe(true);
      expect(find('loadingRemoteClusters').text()).toBe('Loading remote clusters…');
    });

    test('should have a link to the documentation', () => {
      expect(exists('docsButton')).toBe(true);
    });
  });

  describe('when remote clusters are loaded', () => {
    beforeEach(async () => {
      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display the Follower index form', async () => {
      expect(exists('form')).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(form.getErrorsMessages().length).toBe(0);
      expect(find('saveFormButton').props().disabled).toBe(false);

      actions.clickSave();

      expect(exists('formError')).toBe(true);
      expect(form.getErrorsMessages()).toEqual([
        'Leader index is required.',
        'Name is required.'
      ]);
      expect(find('saveFormButton').props().disabled).toBe(true);
    });
  });

  // ....
});
