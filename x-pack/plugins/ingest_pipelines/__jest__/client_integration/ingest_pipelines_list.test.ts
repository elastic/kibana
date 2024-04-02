/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../common/constants';

import { setupEnvironment, pageHelpers } from './helpers';
import { PipelineListTestBed } from './helpers/pipelines_list.helpers';
import { Pipeline } from '../../common/types';

const { setup } = pageHelpers.pipelinesList;

describe('<PipelinesList />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: PipelineListTestBed;

  describe('With pipelines', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

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

    const pipeline3 = {
      name: 'test_pipeline3',
      description: 'test_pipeline3 description',
      processors: [],
      deprecated: true,
    };

    const pipelines = [pipeline1, pipeline2, pipeline3];

    httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);

    test('should render the list view', async () => {
      const { exists, find, table } = testBed;

      // Verify app title
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Ingest Pipelines');

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Documentation');

      // Verify create dropdown exists
      expect(exists('createPipelineDropdown')).toBe(true);

      // Verify table content
      const { tableCellsValues } = table.getMetaData('pipelinesTable');
      tableCellsValues.forEach((row, i) => {
        const pipeline = pipelines[i];

        expect(row).toEqual([
          '',
          pipeline.name,
          '',
          `test_pipeline${i + 1} description`,
          '0',
          'EditDelete',
        ]);
      });
    });

    test('deprecated pipelines are hidden by default', async () => {
      const { table, component } = testBed;
      const { tableCellsValues } = table.getMetaData('pipelinesTable');

      // Table should shouldnt show any deprecated pipelines by default
      const pipelinesWithoutDeprecated = pipelines.filter(
        (pipeline: Pipeline) => !pipeline?.deprecated
      );
      expect(tableCellsValues.length).toEqual(pipelinesWithoutDeprecated.length);

      // Enable filtering by deprecated pipelines
      const searchInput = component.find('.euiFieldSearch').first();
      (searchInput.instance() as unknown as HTMLInputElement).value = 'is:deprecated';
      searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
      component.update();

      // Table should now show only deprecated pipelines
      const { tableCellsValues: tableCellValuesUpdated } = table.getMetaData('pipelinesTable');
      const pipelinesWithDeprecated = pipelines.filter(
        (pipeline: Pipeline) => pipeline?.deprecated
      );
      expect(tableCellValuesUpdated.length).toEqual(pipelinesWithDeprecated.length);
    });

    test('should reload the pipeline data', async () => {
      const { actions } = testBed;

      await actions.clickReloadButton();

      expect(httpSetup.get).toHaveBeenLastCalledWith(API_BASE_PATH, expect.anything());
    });

    test('should show the details of a pipeline', async () => {
      const { find, exists, actions } = testBed;

      await actions.clickPipelineAt(0);

      expect(exists('pipelinesTable')).toBe(true);
      expect(exists('pipelineDetails')).toBe(true);
      expect(find('pipelineDetails.title').text()).toBe(pipeline1.name);
    });

    test('should delete a pipeline', async () => {
      const { actions, component } = testBed;
      const { name: pipelineName } = pipeline1;

      httpRequestsMockHelpers.setDeletePipelineResponse(pipelineName, {
        itemsDeleted: [pipelineName],
        errors: [],
      });

      actions.clickPipelineAction(pipelineName, 'delete');

      // We need to read the document "body" as the modal is added there and not inside
      // the component DOM tree.
      const modal = document.body.querySelector('[data-test-subj="deletePipelinesConfirmation"]');
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      expect(modal).not.toBe(null);
      expect(modal!.textContent).toContain('Delete pipeline');

      await act(async () => {
        confirmButton!.click();
      });

      component.update();

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/${pipelineName}`,
        expect.anything()
      );
    });
  });

  describe('No pipelines', () => {
    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse([]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { exists, component, find } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyList')).toBe(true);
      expect(find('emptyList.title').text()).toEqual('Create your first pipeline');
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadPipelinesResponse(undefined, error);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should render an error message if error fetching pipelines', async () => {
      const { exists, find } = testBed;

      expect(exists('pipelineLoadError')).toBe(true);
      expect(find('pipelineLoadError').text()).toContain('Unable to load pipelines');
    });
  });
});
