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

const { setup } = pageHelpers.pipelinesList;

const pipeline1 = {
  name: 'test_pipeline1',
  description: 'test_pipeline1 description',
  processors: [],
  isManaged: false,
};

const pipeline2 = {
  name: 'test_pipeline2',
  description: 'test_pipeline2 description',
  processors: [],
  isManaged: true,
};

const pipeline3 = {
  name: 'test_pipeline3',
  description: 'test_pipeline3 description',
  processors: [],
  isManaged: false,
};

const pipeline4 = {
  name: 'test_pipeline4',
  description: 'test_pipeline4 description',
  processors: [],
  isManaged: true,
};

const pipelines = [pipeline1, pipeline2, pipeline3, pipeline4];

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

    httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);

    test('should render the list view', async () => {
      const { exists, find, table } = testBed;

      // Verify app title
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Ingest Pipelines');

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Ingest Pipelines docs');

      // Verify create dropdown exists
      expect(exists('createPipelineDropdown')).toBe(true);

      // Verify table content
      const { tableCellsValues } = table.getMetaData('pipelinesTable');
      tableCellsValues.forEach((row, i) => {
        const pipeline = pipelines[i];

        expect(row).toEqual([
          '',
          expect.stringMatching(pipeline.name + '( Managed)?'),
          'EditDelete',
        ]);
      });
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

  describe('Handle view filter', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();
    });

    test('should view button open options popover', async () => {
      const { exists, actions } = testBed;

      expect(exists('filterItem-managed_pipelines')).toBeFalsy();
      expect(exists('filterItem-custom_pipelines')).toBeFalsy();

      expect(exists('viewButton')).toBeTruthy();

      await actions.clickViewButton();

      expect(exists('filterItem-managed_pipelines')).toBeTruthy();
      expect(exists('filterItem-custom_pipelines')).toBeTruthy();
    });

    test('should show only managed pipelines', async () => {
      const { table, actions } = testBed;

      await actions.clickViewButton();
      await actions.clickSimulateFilter('custom_pipelines');

      const { tableCellsValues } = table.getMetaData('pipelinesTable');

      tableCellsValues.forEach((row) => {
        const isManaged = /Managed$/.test(row[1]);
        expect(isManaged).toBeTruthy();
      });
    });

    test('should show only custom pipelines', async () => {
      const { table, actions } = testBed;

      await actions.clickViewButton();
      await actions.clickSimulateFilter('managed_pipelines');

      const { tableCellsValues } = table.getMetaData('pipelinesTable');

      tableCellsValues.forEach((row) => {
        const isManaged = /Managed$/.test(row[1]);
        expect(isManaged).toBeFalsy();
      });
    });

    test('should not display pipelines', async () => {
      const { actions, table } = testBed;

      await actions.clickViewButton();
      await actions.clickSimulateFilter('managed_pipelines');
      await actions.clickSimulateFilter('custom_pipelines');

      const { tableCellsValues } = table.getMetaData('pipelinesTable');
      const isTableEmpty = tableCellsValues.join('') === 'No items found';

      expect(isTableEmpty).toBeTruthy();
    });

    test('should display all pipelines', async () => {
      const { actions, table } = testBed;

      await actions.clickViewButton();
      await actions.clickSimulateFilter('managed_pipelines');
      await actions.clickSimulateFilter('managed_pipelines');

      const { tableCellsValues } = table.getMetaData('pipelinesTable');
      tableCellsValues.forEach((row, i) => {
        const pipeline = pipelines[i];

        expect(row).toEqual([
          '',
          expect.stringMatching(pipeline.name + '( Managed)?'),
          'EditDelete',
        ]);
      });
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
      expect(find('emptyList.title').text()).toEqual('Start by creating a pipeline');
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
