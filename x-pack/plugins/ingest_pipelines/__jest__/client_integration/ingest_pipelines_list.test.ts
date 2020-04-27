/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { ListTestBed } from './helpers/ingest_pipelines_list.helpers';

const { setup } = pageHelpers.ingestPipelinesList;

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

describe('<PipelinesList />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: ListTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('On component mount', () => {
    const pipeline1 = {
      name: 'test_pipeline1',
      description: 'test_pipeline1 description',
      processors: [],
    };

    const pipeline2 = {
      name: 'test_pipeline2',
      description: 'test_pipeline2 description',
      processors: [],
    };

    const pipelines = [pipeline1, pipeline2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);

      testBed = await setup();

      await act(async () => {
        const { component } = testBed;

        await nextTick(100);
        component.update();
      });
    });

    test('should render the table', async () => {
      const { exists, find, table } = testBed;

      // Verify app title
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Ingest Pipelines');

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Ingest Pipelines docs');

      // Verify create button exists
      expect(exists('createPipelineButton')).toBe(true);

      // Verify table content
      const { tableCellsValues } = table.getMetaData('pipelinesTable');
      tableCellsValues.forEach((row, i) => {
        const pipeline = pipelines[i];

        expect(row).toEqual(['', pipeline.name, '']);
      });
    });
  });

  // test: loading
  // test: empty prompt
  // test: reload pipeline
  // test: delete pipeline
  // test: detail panel
  // test: error callout
});
