/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, mockServerResponses, nextTick } from './test_helpers';
import { FollowerIndicesList } from '../../public/app/sections/home/follower_indices_list';

jest.mock('ui/chrome', () => ({
  addBasePath: () => 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('../../../../../src/legacy/ui/public/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

describe('List follower indices', () => {
  let server;
  // let find;
  let exists;
  let component;
  // let userActions;
  // let getFormErrorsMessages;
  // let form;
  // let mockLoadFollowerIndices;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    // ({ mockLoadFollowerIndices } = mockServerResponses(server));
    mockServerResponses(server);
    ({
      // find,
      exists,
      component,
      // userActions,
      // getFormErrorsMessages,
      // form,
    } = initTestBed(FollowerIndicesList));
  });

  describe('when there are no follower indices', () => {
    test('should show a loading indicator on component did mount', async () => {
      expect(exists('ccrFollowerIndexLoading')).toBe(true);
    });

    test('should display an empty prompt', async () => {
      await nextTick(); // We need to wait next tick for the mock server response to come in
      component.update();
      expect(exists('ccrFollowerIndexEmptyPrompt')).toBe(true);
    });
  });
});
