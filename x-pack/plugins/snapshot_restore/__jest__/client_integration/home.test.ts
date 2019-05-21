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

    test('should set the correct app title', () => {
      const { exists, find } = testBed;
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Snapshot Repositories');
    });

    test('should display a loading while fetching the repositories', () => {
      const { exists, find } = testBed;
      expect(exists('sectionLoading')).toBe(true);
      expect(find('sectionLoading').text()).toEqual('Loading repositories…');
    });

    test('should have a link to the documentation', () => {
      const { exists, find } = testBed;
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Snapshot docs');
    });
  });

  describe('when there are no repositories', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
    });

    test('should display an empty prompt', async () => {
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
    const repo1 = fixtures.getRepository({ name: `a${getRandomString()}`, type: 'fs' });
    const repo2 = fixtures.getRepository({ name: `b${getRandomString()}`, type: 'url' });
    const repo3 = fixtures.getRepository({ name: `c${getRandomString()}`, type: 's3' });
    const repo4 = fixtures.getRepository({ name: `d${getRandomString()}`, type: 'hdfs' });
    const repo5 = fixtures.getRepository({ name: `e${getRandomString()}`, type: 'azure' });
    const repo6 = fixtures.getRepository({ name: `f${getRandomString()}`, type: 'gcs' });
    const repo7 = fixtures.getRepository({ name: `g${getRandomString()}`, type: 'source' });
    const repo8 = fixtures.getRepository({
      name: `h${getRandomString()}`,
      type: 'source',
      settings: { delegateType: 'gcs' },
    });

    const repositories = [repo1, repo2, repo3, repo4, repo5, repo6, repo7, repo8];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories });

      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    test('should list them in the table', async () => {
      const { table } = testBed;
      const mapTypeToText: Record<string, string> = {
        fs: 'Shared file system',
        url: 'Read-only URL',
        s3: 'AWS S3',
        hdfs: 'Hadoop HDFS',
        azure: 'Azure',
        gcs: 'Google Cloud Storage',
        source: 'Source-only',
      };

      const { tableCellsValues } = table.getMetaData('repositoryTable');
      tableCellsValues.forEach((row, i) => {
        const repository = repositories[i];
        if (repository === repo8) {
          // The "repo8" is source with a delegate type
          expect(row).toEqual([
            '',
            repository.name,
            `${mapTypeToText[repository.settings.delegateType]} (Source-only)`,
            '',
          ]);
        } else {
          expect(row).toEqual(['', repository.name, mapTypeToText[repository.type], '']);
        }
      });
    });

    describe('detail panel', () => {
      test('should show the detail when clicking on a repository', async () => {
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
