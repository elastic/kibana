/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { WatchStatusTestBed } from './helpers/watch_status.helpers';
import { WATCH } from './helpers/constants';
import { getWatchHistory } from '../../test/fixtures';

jest.mock('ui/chrome', () => ({
  breadcrumbs: { set: () => {} },
  addBasePath: (path: string) => path || '/api/watcher',
}));

const { setup } = pageHelpers.watchStatus;

describe('<WatchStatus />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchStatusTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      const watchHistory1 = getWatchHistory({ startTime: '2019-06-04T01:11:11.294' });
      const watchHistory2 = getWatchHistory({ startTime: '2019-06-04T01:10:10.987Z' });

      const watchHistoryItems = { watchHistoryItems: [watchHistory1, watchHistory2] };

      httpRequestsMockHelpers.setLoadWatchResponse(WATCH);
      httpRequestsMockHelpers.setLoadWatchHistoryResponse(watchHistoryItems);

      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    test('should set the correct page title', () => {
      const { find } = testBed;

      expect(find('pageTitle').text()).toBe(`Current status for '${WATCH.watch.name}'`);
    });
  });
});
