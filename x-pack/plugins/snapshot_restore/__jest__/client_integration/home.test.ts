/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import * as fixtures from '../../test/fixtures';

const { setup } = pageHelpers.home;

describe('<SnapshotRestoreHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    it('should set the correct app title', async () => {
      const { exists, find } = await setup();
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Snapshot Repositories');
    });

    it('should display a loading while fetching the repositories', async () => {
      const { exists, find } = await setup();
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
        await nextTick(350);
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

    beforeEach(() => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [repo1, repo2] });
    });

    it('should list them in the table', async () => {
      const { component, table } = await setup();

      await act(async () => {
        await nextTick(350);
        component.update();
      });

      const { tableCellsValues } = table.getMetaData('repositoryTable');
      const [row1, row2] = tableCellsValues;

      expect(row1).toEqual(['', repo1.name, 'Shared file system', '']);
      expect(row2).toEqual(['', repo2.name, 'Read-only URL', '']);
    });

    it('should show the detail when clicking on a repository', async () => {
      const { component, exists, find, actions } = await setup();

      await act(async () => {
        await nextTick(350);
        component.update();
      });

      expect(exists('repositoryDetail')).toBe(false);

      await act(async () => {
        actions.clickRepositoryAt(0);
        await nextTick(500);
        component.update();
      });

      expect(exists('repositoryDetail')).toBe(true);
      expect(find('repositoryDetail.title').text()).toEqual(repo1.name);
    });
  });
});
