/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../es_ui_shared/console_lang/mocks';

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import {
  setupEnvironment,
  pageHelpers,
  nextTick,
  getRandomString,
  findTestSubject,
} from './helpers';
import { WatchListTestBed } from './helpers/watch_list.helpers';
import { ROUTES } from '../../common/constants';

const { API_ROOT } = ROUTES;

const { setup } = pageHelpers.watchList;

describe('<WatchList />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchListTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      testBed = await setup();
    });

    describe('watches', () => {
      describe('when there are no watches', () => {
        beforeEach(() => {
          httpRequestsMockHelpers.setLoadWatchesResponse({ watches: [] });
        });

        test('should display an empty prompt', async () => {
          const { component, exists } = await setup();

          await act(async () => {
            await nextTick();
            component.update();
          });

          expect(exists('emptyPrompt')).toBe(true);
          expect(exists('emptyPrompt.createWatchButton')).toBe(true);
        });
      });

      // create a threshold and advanced watch type and monitoring
      describe('when there are watches', () => {
        const watch1 = fixtures.getWatch({
          name: `watchA-${getRandomString()}`,
          id: `a-${getRandomString()}`,
          type: 'threshold',
        });
        const watch2 = fixtures.getWatch({
          name: `watchB-${getRandomString()}`,
          id: `b-${getRandomString()}`,
          type: 'json',
        });
        const watch3 = fixtures.getWatch({
          name: `watchC-${getRandomString()}`,
          id: `c-${getRandomString()}`,
          type: 'monitoring',
          isSystemWatch: true,
        });

        const watches = [watch1, watch2, watch3];

        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadWatchesResponse({ watches });

          testBed = await setup();

          await act(async () => {
            await nextTick();
            testBed.component.update();
          });
        });

        test('should set the correct app title', () => {
          const { exists, find } = testBed;
          expect(exists('appTitle')).toBe(true);
          expect(find('appTitle').text()).toEqual('Watcher');
        });

        test('should have a link to the documentation', () => {
          const { exists, find } = testBed;
          expect(exists('documentationLink')).toBe(true);
          expect(find('documentationLink').text()).toBe('Watcher docs');
        });

        test('should list them in the table', async () => {
          const { table } = testBed;
          const { tableCellsValues } = table.getMetaData('watchesTable');

          const getExpectedValue = (value: any) => (typeof value === 'undefined' ? '' : value);

          tableCellsValues.forEach((row, i) => {
            const watch = watches[i];
            const { name, id, watchStatus } = watch;

            expect(row).toEqual([
              '',
              id, // required value
              getExpectedValue(name),
              watchStatus.state, // required value
              getExpectedValue(watchStatus.comment),
              getExpectedValue(watchStatus.lastMetCondition),
              getExpectedValue(watchStatus.lastChecked),
              '',
            ]);
          });
        });

        test('should have a button to create a watch', () => {
          const { exists } = testBed;
          expect(exists('createWatchButton')).toBe(true);
        });

        test('should have a link to view watch details', () => {
          const { table } = testBed;
          const { rows } = table.getMetaData('watchesTable');
          const idColumn = rows[0].columns[1].reactWrapper;

          expect(findTestSubject(idColumn, `watchIdColumn-${watch1.id}`).length).toBe(1);
          expect(findTestSubject(idColumn, `watchIdColumn-${watch1.id}`).props().href).toEqual(
            `#/management/elasticsearch/watcher/watches/watch/${watch1.id}/status`
          );
        });

        test('should have action buttons on each row to edit and delete a watch', () => {
          const { table } = testBed;
          const { rows } = table.getMetaData('watchesTable');
          const lastColumn = rows[0].columns[rows[0].columns.length - 1].reactWrapper;

          expect(findTestSubject(lastColumn, 'editWatchButton').length).toBe(1);
          expect(findTestSubject(lastColumn, 'deleteWatchButton').length).toBe(1);
        });

        describe('system watch', () => {
          test('should disable edit and delete actions', async () => {
            const { table } = testBed;
            const { rows } = table.getMetaData('watchesTable');
            const systemWatch = rows[2];
            const firstColumn = systemWatch.columns[0].reactWrapper;
            const lastColumn = systemWatch.columns[rows[0].columns.length - 1].reactWrapper;

            expect(
              findTestSubject(firstColumn, `checkboxSelectRow-${watch3.id}`)
                .getDOMNode()
                .getAttribute('disabled')
            ).toEqual('');
            expect(
              findTestSubject(lastColumn, 'editWatchButton')
                .getDOMNode()
                .getAttribute('disabled')
            ).toEqual('');
            expect(
              findTestSubject(lastColumn, 'deleteWatchButton')
                .getDOMNode()
                .getAttribute('disabled')
            ).toEqual('');
          });
        });

        describe('delete watch', () => {
          test('should show a confirmation when clicking the delete watch button', async () => {
            const { actions } = testBed;

            await actions.clickWatchActionAt(0, 'delete');

            // We need to read the document "body" as the modal is added there and not inside
            // the component DOM tree.
            expect(
              document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]')
            ).not.toBe(null);

            expect(
              document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]')!
                .textContent
            ).toContain('Delete watch');
          });

          test('should send the correct HTTP request to delete watch', async () => {
            const { component, actions, table } = testBed;
            const { rows } = table.getMetaData('watchesTable');

            const watchId = rows[0].columns[2].value;

            await actions.clickWatchActionAt(0, 'delete');

            const modal = document.body.querySelector(
              '[data-test-subj="deleteWatchesConfirmation"]'
            );
            const confirmButton: HTMLButtonElement | null = modal!.querySelector(
              '[data-test-subj="confirmModalConfirmButton"]'
            );

            httpRequestsMockHelpers.setDeleteWatchResponse({
              results: {
                successes: [watchId],
                errors: [],
              },
            });

            await act(async () => {
              confirmButton!.click();
              await nextTick();
              component.update();
            });

            const latestRequest = server.requests[server.requests.length - 1];

            expect(latestRequest.method).toBe('POST');
            expect(latestRequest.url).toBe(`${API_ROOT}/watches/delete`);
          });
        });
      });
    });
  });
});
