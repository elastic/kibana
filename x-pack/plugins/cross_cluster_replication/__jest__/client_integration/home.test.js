/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { MemoryRouter, Route } from 'react-router-dom';

import { initTestBed, mockServerResponses, nextTick } from './test_helpers';
import { CrossClusterReplicationHome } from '../../public/app/sections/home/home';
import { BASE_PATH } from '../../common/constants';
import routing from '../../public/app/services/routing';

jest.mock('ui/chrome', () => ({
  addBasePath: () => 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

class AppMock extends Component {
  static contextTypes = {
    router: PropTypes.object
  };

  componentDidMount() {
    const { router } = this.context;
    routing.reactRouter = router;
  }

  render() {
    return (
      <Route component={CrossClusterReplicationHome} path={`${BASE_PATH}/:section`}/>
    );
  }
}

const AppWithRouter = () => (
  <MemoryRouter initialEntries={[`${BASE_PATH}/follower_indices`]}>
    <AppMock />
  </MemoryRouter>
);

describe('<CrossClusterReplicationHome />', () => {
  let server;
  let find;
  let exists;
  let component;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    mockServerResponses(server);
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      ({ exists, find, component } = initTestBed(AppWithRouter));
    });

    test('should set the correct an app title', () => {
      expect(exists('ccrAppTitle')).toBe(true);
      expect(find('ccrAppTitle').text()).toEqual('Cross Cluster Replication');
    });

    test('should have 2 tabs to switch between "Follower indices" & "Auto-follow patterns"', () => {
      expect(exists('ccrFollowerIndicesTab')).toBe(true);
      expect(find('ccrFollowerIndicesTab').text()).toEqual('Follower indices');

      expect(exists('ccrAutoFollowPatternsTab')).toBe(true);
      expect(find('ccrAutoFollowPatternsTab').text()).toEqual('Auto-follow patterns');
    });

    test('should set the default selected tab to "Follower indices"', () => {
      expect(component.find('.euiTab-isSelected').text()).toBe('Follower indices');

      // Verify that the <FollowerIndicesList /> component is rendered
      expect(component.find('FollowerIndicesList').length).toBe(1);
    });
  });

  describe('section change', () => {
    test('should change to auto-follow pattern', async () => {
      const autoFollowPatternsTab = find('ccrAutoFollowPatternsTab');

      autoFollowPatternsTab.simulate('click');
      await nextTick();
      component.update();

      expect(component.find('.euiTab-isSelected').text()).toBe('Auto-follow patterns');

      // Verify that the <AutoFollowPatternList /> component is rendered
      expect(component.find('AutoFollowPatternList').length).toBe(1);
    });
  });
});
