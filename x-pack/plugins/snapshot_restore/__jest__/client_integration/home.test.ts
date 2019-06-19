/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import { SNAPSHOT_STATE } from '../../public/app/constants';
import { API_BASE_PATH } from '../../common/constants';
import { formatDate } from '../../public/app/services/text';
import {
  setupEnvironment,
  pageHelpers,
  nextTick,
  getRandomString,
  findTestSubject,
} from './helpers';
import { HomeTestBed } from './helpers/home.helpers';
import { REPOSITORY_NAME } from './helpers/constant';

const { setup } = pageHelpers.home;

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map(value => {
    if (!value.trim) {
      return value;
    }
    return value.trim();
  });

// We need to skip the tests until react 16.9.0 is released
// which supports asynchronous code inside act()
describe.skip('<SnapshotRestoreHome />', () => {
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

        // @ts-ignore (remove when react 16.9.0 is released)
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

        // @ts-ignore (remove when react 16.9.0 is released)
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

        // @ts-ignore (remove when react 16.9.0 is released)
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
            expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
              '',
              repository.name,
              `${mapTypeToText[repository.settings.delegateType]} (Source-only)`,
              '',
            ]);
          } else {
            expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
              '',
              repository.name,
              mapTypeToText[repository.type],
              '',
            ]);
          }
        });
      });

      test('should have a button to reload the repositories', async () => {
        const { component, exists, actions } = testBed;
        const totalRequests = server.requests.length;
        expect(exists('reloadButton')).toBe(true);

        // @ts-ignore (remove when react 16.9.0 is released)
        await act(async () => {
          actions.clickReloadButton();
          await nextTick();
          component.update();
        });

        expect(server.requests.length).toBe(totalRequests + 1);
        expect(server.requests[server.requests.length - 1].url).toBe(
          `${API_BASE_PATH}repositories`
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
          const { actions } = testBed;

          await actions.clickRepositoryActionAt(0, 'delete');

          // We need to read the document "body" as the modal is added there and not inside
          // the component DOM tree.
          expect(
            document.body.querySelector('[data-test-subj="deleteRepositoryConfirmation"]')
          ).not.toBe(null);

          expect(
            document.body.querySelector('[data-test-subj="deleteRepositoryConfirmation"]')!
              .textContent
          ).toContain(`Remove repository '${repo1.name}'?`);
        });

        test('should send the correct HTTP request to delete repository', async () => {
          const { component, actions } = testBed;

          await actions.clickRepositoryActionAt(0, 'delete');

          const modal = document.body.querySelector(
            '[data-test-subj="deleteRepositoryConfirmation"]'
          );
          const confirmButton: HTMLButtonElement | null = modal!.querySelector(
            '[data-test-subj="confirmModalConfirmButton"]'
          );

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            confirmButton!.click();
            await nextTick();
            component.update();
          });

          const latestRequest = server.requests[server.requests.length - 1];

          expect(latestRequest.method).toBe('DELETE');
          expect(latestRequest.url).toBe(`${API_BASE_PATH}repositories/${repo1.name}`);
        });
      });

      describe('detail panel', () => {
        test('should show the detail when clicking on a repository', async () => {
          const { exists, actions } = testBed;

          expect(exists('repositoryDetail')).toBe(false);

          await actions.clickRepositoryAt(0);

          expect(exists('repositoryDetail')).toBe(true);
        });

        test('should set the correct title', async () => {
          const { find, actions } = testBed;

          await actions.clickRepositoryAt(0);

          expect(find('repositoryDetail.title').text()).toEqual(repo1.name);
        });

        test('should show a loading state while fetching the repository', async () => {
          const { find, exists, actions } = testBed;

          // By providing undefined, the "loading section" will be displayed
          httpRequestsMockHelpers.setGetRepositoryResponse(undefined);

          await actions.clickRepositoryAt(0);

          expect(exists('repositoryDetail.sectionLoading')).toBe(true);
          expect(find('repositoryDetail.sectionLoading').text()).toEqual('Loading repository…');
        });

        describe('when the repository has been fetched', () => {
          beforeEach(async () => {
            httpRequestsMockHelpers.setGetRepositoryResponse({
              repository: {
                name: 'my-repo',
                type: 'fs',
                settings: { location: '/tmp/es-backups' },
              },
              snapshots: { count: 0 },
            });

            await testBed.actions.clickRepositoryAt(0);
          });

          test('should have a link to the documentation', async () => {
            const { exists } = testBed;

            expect(exists('repositoryDetail.documentationLink')).toBe(true);
          });

          test('should set the correct repository settings', () => {
            const { find } = testBed;

            expect(find('repositoryDetail.repositoryType').text()).toEqual('Shared file system');
            expect(find('repositoryDetail.snapshotCount').text()).toEqual(
              'Repository has no snapshots'
            );
          });

          test('should have a button to verify the status of the repository', async () => {
            const { exists, find, component } = testBed;
            expect(exists('repositoryDetail.verifyRepositoryButton')).toBe(true);

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              find('repositoryDetail.verifyRepositoryButton').simulate('click');
              await nextTick();
              component.update();
            });

            const latestRequest = server.requests[server.requests.length - 1];

            expect(latestRequest.method).toBe('GET');
            expect(latestRequest.url).toBe(`${API_BASE_PATH}repositories/${repo1.name}/verify`);
          });
        });

        describe('when the repository has been fetched (and has snapshots)', () => {
          beforeEach(async () => {
            httpRequestsMockHelpers.setGetRepositoryResponse({
              repository: {
                name: 'my-repo',
                type: 'fs',
                settings: { location: '/tmp/es-backups' },
              },
              snapshots: { count: 2 },
            });

            await testBed.actions.clickRepositoryAt(0);
          });

          test('should indicate the number of snapshots found', () => {
            const { find } = testBed;
            expect(find('repositoryDetail.snapshotCount').text()).toEqual('2 snapshots found');
          });
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

        // @ts-ignore (remove when react 16.9.0 is released)
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

        // @ts-ignore (remove when react 16.9.0 is released)
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

    describe('when there are snapshots and repositories', () => {
      const snapshot1 = fixtures.getSnapshot({
        repository: REPOSITORY_NAME,
        snapshot: `a${getRandomString()}`,
      });
      const snapshot2 = fixtures.getSnapshot({
        repository: REPOSITORY_NAME,
        snapshot: `b${getRandomString()}`,
      });
      const snapshots = [snapshot1, snapshot2];

      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({
          snapshots,
          repositories: [REPOSITORY_NAME],
          errors: {},
        });

        testBed = await setup();

        // @ts-ignore (remove when react 16.9.0 is released)
        await act(async () => {
          testBed.actions.selectTab('snapshots');
          await nextTick(2000);
          testBed.component.update();
        });
      });

      test('should list them in the table', async () => {
        const { table } = testBed;

        const { tableCellsValues } = table.getMetaData('snapshotTable');
        tableCellsValues.forEach((row, i) => {
          const snapshot = snapshots[i];
          expect(row).toEqual([
            snapshot.snapshot, // Snapshot
            REPOSITORY_NAME, // Repository
            formatDate(snapshot.startTimeInMillis), // Date created
            `${Math.ceil(snapshot.durationInMillis / 1000).toString()}s`, // Duration
            snapshot.indices.length.toString(), // Indices
            snapshot.shards.total.toString(), // Shards
            snapshot.shards.failed.toString(), // Failed shards
          ]);
        });
      });

      test('each row should have a link to the repository', async () => {
        const { component, find, exists, table, router } = testBed;

        const { rows } = table.getMetaData('snapshotTable');
        const repositoryLink = findTestSubject(rows[0].reactWrapper, 'repositoryLink');
        const { href } = repositoryLink.props();

        // @ts-ignore (remove when react 16.9.0 is released)
        await act(async () => {
          router.navigateTo(href!);
          await nextTick();
          component.update();
        });

        // Make sure that we navigated to the repository list
        // and opened the detail panel for the repository
        expect(exists('snapshotList')).toBe(false);
        expect(exists('repositoryList')).toBe(true);
        expect(exists('repositoryDetail')).toBe(true);
        expect(find('repositoryDetail.title').text()).toBe(REPOSITORY_NAME);
      });

      test('should have a button to reload the snapshots', async () => {
        const { component, exists, actions } = testBed;
        const totalRequests = server.requests.length;
        expect(exists('reloadButton')).toBe(true);

        // @ts-ignore (remove when react 16.9.0 is released)
        await act(async () => {
          actions.clickReloadButton();
          await nextTick();
          component.update();
        });

        expect(server.requests.length).toBe(totalRequests + 1);
        expect(server.requests[server.requests.length - 1].url).toBe(`${API_BASE_PATH}snapshots`);
      });

      describe('detail panel', () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setGetSnapshotResponse(snapshot1);
        });

        test('should show the detail when clicking on a snapshot', async () => {
          const { exists, actions } = testBed;
          expect(exists('snapshotDetail')).toBe(false);

          await actions.clickSnapshotAt(0);

          expect(exists('snapshotDetail')).toBe(true);
        });

        test('should show a loading while fetching the snapshot', async () => {
          const { find, exists, actions } = testBed;
          // By providing undefined, the "loading section" will be displayed
          httpRequestsMockHelpers.setGetSnapshotResponse(undefined);

          await actions.clickSnapshotAt(0);

          expect(exists('snapshotDetail.sectionLoading')).toBe(true);
          expect(find('snapshotDetail.sectionLoading').text()).toEqual('Loading snapshot…');
        });

        describe('on mount', () => {
          beforeEach(async () => {
            await testBed.actions.clickSnapshotAt(0);
          });

          test('should set the correct title', async () => {
            const { find } = testBed;

            expect(find('snapshotDetail.detailTitle').text()).toEqual(snapshot1.snapshot);
          });

          test('should have a link to show the repository detail', async () => {
            const { component, exists, find, router } = testBed;
            expect(exists('snapshotDetail.repositoryLink')).toBe(true);

            const { href } = find('snapshotDetail.repositoryLink').props();

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              router.navigateTo(href);
              await nextTick();
              component.update();
            });

            // Make sure that we navigated to the repository list
            // and opened the detail panel for the repository
            expect(exists('snapshotList')).toBe(false);
            expect(exists('repositoryList')).toBe(true);
            expect(exists('repositoryDetail')).toBe(true);
            expect(find('repositoryDetail.title').text()).toBe(REPOSITORY_NAME);
          });

          test('should have a button to close the detail panel', () => {
            const { find, exists } = testBed;
            expect(exists('snapshotDetail.closeButton')).toBe(true);

            find('snapshotDetail.closeButton').simulate('click');

            expect(exists('snapshotDetail')).toBe(false);
          });

          describe('tabs', () => {
            test('should have 2 tabs', () => {
              const { find } = testBed;
              const tabs = find('snapshotDetail.tab');

              expect(tabs.length).toBe(2);
              expect(tabs.map(t => t.text())).toEqual(['Summary', 'Failed indices (0)']);
            });

            test('should have the default tab set on "Summary"', () => {
              const { find } = testBed;

              const tabs = find('snapshotDetail.tab');
              const selectedTab = find('snapshotDetail').find('.euiTab-isSelected');

              expect(selectedTab.instance()).toBe(tabs.at(0).instance());
            });

            describe('summary tab', () => {
              test('should set the correct summary values', () => {
                const { find } = testBed;

                expect(find('snapshotDetail.version.value').text()).toBe(
                  `${snapshot1.version} / ${snapshot1.versionId}`
                );
                expect(find('snapshotDetail.uuid.value').text()).toBe(snapshot1.uuid);
                expect(find('snapshotDetail.state.value').text()).toBe('Snapshot complete');
                expect(find('snapshotDetail.includeGlobalState.value').text()).toBe('Yes');
                expect(find('snapshotDetail.indices.title').text()).toBe(
                  `Indices (${snapshot1.indices.length})`
                );
                expect(find('snapshotDetail.indices.value').text()).toBe(
                  snapshot1.indices.join('')
                );
                expect(find('snapshotDetail.startTime.value').text()).toBe(
                  formatDate(snapshot1.startTimeInMillis)
                );
                expect(find('snapshotDetail.endTime.value').text()).toBe(
                  formatDate(snapshot1.endTimeInMillis)
                );
              });

              test('should indicate the different snapshot states', async () => {
                const { find, actions } = testBed;

                // We need to click back and forth between the first table row (0) and  the second row (1)
                // in order to trigger the HTTP request that loads the snapshot with the new state.
                // This varible keeps track of it.
                let itemIndexToClickOn = 1;

                const setSnapshotStateAndUpdateDetail = async (state: string) => {
                  const updatedSnapshot = { ...snapshot1, state };
                  httpRequestsMockHelpers.setGetSnapshotResponse(updatedSnapshot);
                  await actions.clickSnapshotAt(itemIndexToClickOn); // click another snapshot to trigger the HTTP call
                };

                const expectMessageForSnapshotState = async (
                  state: string,
                  expectedMessage: string
                ) => {
                  await setSnapshotStateAndUpdateDetail(state);

                  const stateMessage = find('snapshotDetail.state.value').text();
                  try {
                    expect(stateMessage).toBe(expectedMessage);
                  } catch {
                    throw new Error(
                      `Expected snapshot state message "${expectedMessage}" for state "${state}, but got "${stateMessage}".`
                    );
                  }

                  itemIndexToClickOn = itemIndexToClickOn ? 0 : 1;
                };

                const mapStateToMessage = {
                  [SNAPSHOT_STATE.IN_PROGRESS]: 'Taking snapshot…',
                  [SNAPSHOT_STATE.FAILED]: 'Snapshot failed',
                  [SNAPSHOT_STATE.PARTIAL]: 'Partial failure ',
                  [SNAPSHOT_STATE.INCOMPATIBLE]: 'Incompatible version ',
                };

                // Call sequencially each state and verify that the message is ok
                return Object.entries(mapStateToMessage).reduce((promise, [state, message]) => {
                  return promise.then(async () => expectMessageForSnapshotState(state, message));
                }, Promise.resolve());
              });
            });

            describe('failed indices tab', () => {
              test('should display a message when snapshot created successfully', () => {
                const { find, actions } = testBed;
                actions.selectSnapshotDetailTab('failedIndices');

                expect(find('snapshotDetail.content').text()).toBe(
                  'All indices were stored successfully.'
                );
              });

              test('should display a message when snapshot in progress ', async () => {
                const { find, actions } = testBed;
                const updatedSnapshot = { ...snapshot1, state: 'IN_PROGRESS' };
                httpRequestsMockHelpers.setGetSnapshotResponse(updatedSnapshot);

                await actions.clickSnapshotAt(1); // click another snapshot to trigger the HTTP call
                actions.selectSnapshotDetailTab('failedIndices');

                expect(find('snapshotDetail.content').text()).toBe('Snapshot is being created.');
              });
            });
          });
        });
      });

      describe('when there are failed indices', () => {
        const failure1 = fixtures.getIndexFailure();
        const failure2 = fixtures.getIndexFailure();
        const indexFailures = [failure1, failure2];

        beforeEach(async () => {
          const updatedSnapshot = { ...snapshot1, indexFailures };
          httpRequestsMockHelpers.setGetSnapshotResponse(updatedSnapshot);
          await testBed.actions.clickSnapshotAt(0);
          testBed.actions.selectSnapshotDetailTab('failedIndices');
        });

        test('should update the tab label', () => {
          const { find } = testBed;
          expect(
            find('snapshotDetail.tab')
              .at(1)
              .text()
          ).toBe(`Failed indices (${indexFailures.length})`);
        });

        test('should display the failed indices', () => {
          const { find } = testBed;

          const expected = indexFailures.map(failure => failure.index);
          const found = find('snapshotDetail.indexFailure.index').map(wrapper => wrapper.text());

          expect(find('snapshotDetail.indexFailure').length).toBe(2);
          expect(found).toEqual(expected);
        });

        test('should detail the failure for each index', () => {
          const { find } = testBed;
          const index0Failure = find('snapshotDetail.indexFailure').at(0);
          const failuresFound = findTestSubject(index0Failure, 'failure');

          expect(failuresFound.length).toBe(failure1.failures.length);

          const failure0 = failuresFound.at(0);
          const shardText = findTestSubject(failure0, 'shard').text();
          const reasonText = findTestSubject(failure0, 'reason').text();
          const [mockedFailure] = failure1.failures;

          expect(shardText).toBe(`Shard ${mockedFailure.shard_id}`);
          expect(reasonText).toBe(`${mockedFailure.status}: ${mockedFailure.reason}`);
        });
      });
    });
  });
});
