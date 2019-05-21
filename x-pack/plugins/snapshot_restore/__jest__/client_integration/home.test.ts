/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import {
  setupEnvironment,
  pageHelpers,
  nextTick,
  getRandomString,
  findTestSubject,
} from './helpers';
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
        const { exists, actions } = testBed;

        expect(exists('repositoryList')).toBe(true);
        expect(exists('snapshotList')).toBe(false);

        actions.selectTab('snapshots');

        expect(exists('repositoryList')).toBe(false);
        expect(exists('snapshotList')).toBe(true);
      });
    });
  });

  describe('repositories', () => {
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

      test('should have a button to reload the repositories', async () => {
        const { component, exists, find } = testBed;
        const totalRequests = server.requests.length;
        expect(exists('reloadButton')).toBe(true);

        await act(async () => {
          find('reloadButton').simulate('click');
          await nextTick();
          component.update();
        });

        expect(server.requests.length).toBe(totalRequests + 1);
        expect(server.requests[server.requests.length - 1].url).toBe(
          '/api/snapshot_restore/repositories'
        );
      });

      test('should have a button to register a new repository', () => {
        const { exists } = testBed;
        expect(exists('registerRepositoryButton')).toBe(true);
      });

      test('should have action buttons on each row to edit and delete a repository', () => {
        const { table } = testBed;
        const { rows } = table.getMetaData('repositoryTable');
        const lastColumn = rows[0].columns[rows[0].columns.length - 1].reactWrapper;

        expect(findTestSubject(lastColumn, 'editRepositoryButton').length).toBe(1);
        expect(findTestSubject(lastColumn, 'deleteRepositoryButton').length).toBe(1);
      });

      describe('delete repository', () => {
        test('should show a confirmation when clicking the delete repository button', async () => {
          const { table, actions } = testBed;
          const { rows } = table.getMetaData('repositoryTable');

          await actions.clickRepositoryActionAt(0, 'delete');

          // We need to read the document "body" as the modal is added there and not inside
          // the component DOM tree.
          expect(
            document.body.querySelector('[data-test-subj="deleteRepositoryConfirmation"]')
          ).not.toBe(null);

          expect(
            document.body.querySelector('[data-test-subj="deleteRepositoryConfirmation"]')!
              .textContent
          ).toContain(`Remove repository '${rows[0].columns[1].value}'?`);
        });

        test('should send the correct HTTP request to delete repository', async () => {
          const { component, table, actions } = testBed;
          const { rows } = table.getMetaData('repositoryTable');

          await actions.clickRepositoryActionAt(0, 'delete');

          const modal = document.body.querySelector(
            '[data-test-subj="deleteRepositoryConfirmation"]'
          );
          const confirmButton: HTMLButtonElement | null = modal!.querySelector(
            '[data-test-subj="confirmModalConfirmButton"]'
          );

          await act(async () => {
            confirmButton!.click();
            await nextTick();
            component.update();
          });

          const latestRequest = server.requests[server.requests.length - 1];

          expect(latestRequest.method).toBe('DELETE');
          expect(latestRequest.url).toBe(
            `/api/snapshot_restore/repositories/${rows[0].columns[1].value}`
          );
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
  });

  describe('snapshots', () => {
    describe('when there are no snapshots nor repositories', () => {
      beforeAll(() => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], repositories: [] });
      });

      beforeEach(async () => {
        testBed = await setup();

        await act(async () => {
          testBed.actions.selectTab('snapshots');
          await nextTick(100);
          testBed.component.update();
        });
      });

      test('should display an empty prompt', () => {
        const { exists } = testBed;

        expect(exists('emptyPrompt')).toBe(true);
      });

      test('should invite the user to first register a repository', () => {
        const { find, exists } = testBed;
        expect(find('emptyPrompt.title').text()).toBe(
          `You don't have any snapshots or repositories yet`
        );
        expect(exists('emptyPrompt.registerRepositoryButton')).toBe(true);
      });
    });

    describe('when there are no snapshots but has some repository', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({
          snapshots: [],
          repositories: ['my-repo'],
        });

        testBed = await setup();

        await act(async () => {
          testBed.actions.selectTab('snapshots');
          await nextTick(2000);
          testBed.component.update();
        });
      });

      test('should display an empty prompt', () => {
        const { find, exists } = testBed;

        expect(exists('emptyPrompt')).toBe(true);
        expect(find('emptyPrompt.title').text()).toBe(`You don't have any snapshots yet`);
      });

      test('should have a link to the snapshot documentation', () => {
        const { exists } = testBed;
        expect(exists('emptyPrompt.documentationLink')).toBe(true);
      });
    });

    describe('when there are snapshots', () => {
      // TODO
    });
  });
});
