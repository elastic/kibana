/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './mocks';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';

const { setup } = pageHelpers.home;

describe('<CrossClusterReplicationHome />', () => {
  let httpRequestsMockHelpers;
  let find;
  let exists;
  let component;

  beforeAll(() => {
    ({ httpRequestsMockHelpers } = setupEnvironment());
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadFollowerIndicesResponse();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      ({ exists, find, component } = setup());
    });

    test('should set the correct app title', () => {
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Cross-Cluster Replication');
    });

    test('should have 2 tabs to switch between "Follower indices" & "Auto-follow patterns"', () => {
      expect(exists('followerIndicesTab')).toBe(true);
      expect(find('followerIndicesTab').text()).toEqual('Follower indices');

      expect(exists('autoFollowPatternsTab')).toBe(true);
      expect(find('autoFollowPatternsTab').text()).toEqual('Auto-follow patterns');
    });

    test('should set the default selected tab to "Follower indices"', () => {
      expect(component.find('.euiTab-isSelected').text()).toBe('Follower indices');

      // Verify that the <FollowerIndicesList /> component is rendered
      expect(component.find('FollowerIndicesList').length).toBe(1);
    });
  });

  describe('section change', () => {
    test('should change to auto-follow pattern', async () => {
      const autoFollowPatternsTab = find('autoFollowPatternsTab');

      autoFollowPatternsTab.simulate('click');
      await nextTick();
      component.update();

      expect(component.find('.euiTab-isSelected').text()).toBe('Auto-follow patterns');

      // Verify that the <AutoFollowPatternList /> component is rendered
      expect(component.find('AutoFollowPatternList').length).toBe(1);
    });
  });
});
