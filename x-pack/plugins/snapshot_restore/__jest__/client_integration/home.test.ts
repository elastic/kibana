/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import { HomeTestBed } from './helpers/home.helpers';

const { setup } = pageHelpers.home;

describe('<SnapshotRestoreHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: HomeTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      testBed = await setup();
    });

    it('should set the correct app title', () => {
      //
    });

    it('should display a loading while fetching the repositories', () => {
      //
    });
  });

  describe('when there are no repositories', () => {
    beforeEach(() => {
      // Mock HTTP request to load repositories
    });

    it('should display an empty prompt', async () => {
      const { component, exists } = await setup();

      await act(async () => {
        await nextTick();
        component.update();
      });

      // check no more "sectionLoading"
      // check "emptyPrompt"
      // check empty prompt "registerRepositoryButton"
    });
  });

  describe('when there are repositories', () => {
    const repo1 = fixtures.getRepository({ name: `a${getRandomString}`, type: 'fs' });
    const repo2 = fixtures.getRepository({
      name: `b${getRandomString}`,
      type: 'url',
      settings: { url: 'file:///tmp/es-backups' },
    });

    beforeEach(async () => {
      // Mock repositories list
      // Create testBed
      // Act async
    });

    it('should list them in the table', async () => {
      //
    });

    it('should show the detail when clicking on a repository', async () => {
      const { component, exists, find, actions } = testBed;

      await act(async () => {
        // click on repo in table
      });

      // check that "repositoryDetail" and its "title" exists
    });
  });

  describe('tabs', () => {
    beforeEach(async () => {
      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    test('should have 2 tabs', () => {
      //
    });

    test('should navigate to snapshot list tab', () => {
      const { find, exists } = testBed;

      // make sure "repositoryList" is there but not "snapshotList"

      // Click on first tab

      // make sure "snapshotList" is there but not "repositoryList"
    });
  });
});
