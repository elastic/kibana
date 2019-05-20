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
      const { exists, find } = testBed;
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Snapshot Repositories');
    });

    it('should display a loading while fetching the repositories', () => {
      const { exists, find } = testBed;
      expect(exists('sectionLoading')).toBe(true);
      expect(find('sectionLoading').text()).toEqual('Loading repositories…');
    });
  });

  describe('when there are no repositories', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
    });

    it('should display an empty prompt', async () => {
      const { component, exists } = await setup();

      await act(async () => {
        await nextTick();
        component.update();
      });

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(true);
      expect(exists('emptyPrompt.registerRepositoryButton')).toBe(true);
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
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [repo1, repo2] });

      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    it('should list them in the table', async () => {
      const { table } = testBed;

      const { tableCellsValues } = table.getMetaData('repositoryTable');
      const [row1, row2] = tableCellsValues;

      expect(row1).toEqual(['', repo1.name, 'Shared file system', '']);
      expect(row2).toEqual(['', repo2.name, 'Read-only URL', '']);
    });

    it('should show the detail when clicking on a repository', async () => {
      const { component, exists, find, actions } = testBed;

      expect(exists('repositoryDetail')).toBe(false);

      await act(async () => {
        actions.clickRepositoryAt(0);

        await nextTick();
        component.update();
      });

      expect(exists('repositoryDetail')).toBe(true);
      expect(find('repositoryDetail.title').text()).toEqual(repo1.name);
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
      const { find } = testBed;

      expect(find('tab').length).toBe(2);
      expect(find('tab').map(t => t.text())).toEqual(['Snapshots', 'Repositories']);
    });

    test('should navigate to snapshot list tab', () => {
      const { find, exists } = testBed;

      expect(exists('repositoryList')).toBe(true);
      expect(exists('snapshotList')).toBe(false);

      find('tab')
        .at(0)
        .simulate('click');

      expect(exists('repositoryList')).toBe(false);
      expect(exists('snapshotList')).toBe(true);
    });
  });
});
