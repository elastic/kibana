/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment } from '../helpers';

import { DataStreamsTabTestBed, setup, createDataStreamPayload } from './data_streams_tab.helpers';

describe('Data Streams tab', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: DataStreamsTabTestBed;

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadIndicesResponse([]);

    await act(async () => {
      testBed = await setup();
    });
  });

  describe('when there are no data streams', () => {
    beforeEach(async () => {
      const { actions, component } = testBed;

      httpRequestsMockHelpers.setLoadDataStreamsResponse([]);

      await act(async () => {
        actions.goToDataStreamsList();
      });

      component.update();
    });

    test('should display an empty prompt', async () => {
      const { exists } = testBed;

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(true);
    });
  });

  describe('when there are data streams', () => {
    beforeEach(async () => {
      const { actions, component } = testBed;

      httpRequestsMockHelpers.setLoadDataStreamsResponse([
        createDataStreamPayload('dataStream1'),
        createDataStreamPayload('dataStream2'),
      ]);

      await act(async () => {
        actions.goToDataStreamsList();
      });

      component.update();
    });

    test('should list them in the table', async () => {
      const { table } = testBed;

      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        ['dataStream1', '1', '@timestamp', '1'],
        ['dataStream2', '1', '@timestamp', '1'],
      ]);
    });

    test('should have a button to reload the data streams', async () => {
      const { exists, actions } = testBed;
      const totalRequests = server.requests.length;

      expect(exists('reloadButton')).toBe(true);

      await act(async () => {
        actions.clickReloadButton();
      });

      expect(server.requests.length).toBe(totalRequests + 1);
      expect(server.requests[server.requests.length - 1].url).toBe(`${API_BASE_PATH}/data_streams`);
    });
  });
});
