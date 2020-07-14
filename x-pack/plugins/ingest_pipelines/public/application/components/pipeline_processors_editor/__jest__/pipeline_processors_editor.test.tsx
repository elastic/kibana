/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { setup, SetupResult } from './pipeline_processors_editor.helpers';
import { Pipeline } from '../../../../../common/types';

const testProcessors: Pick<Pipeline, 'processors'> = {
  processors: [
    {
      script: {
        source: 'ctx._type = null',
      },
    },
    {
      gsub: {
        field: '_index',
        pattern: '(.monitoring-\\w+-)6(-.+)',
        replacement: '$17$2',
      },
    },
  ],
};

describe('Pipeline Editor', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();
    testBed = await setup({
      value: {
        ...testProcessors,
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
      links: {
        esDocsBasePath: 'test',
      },
    });
  });

  it('provides the same data out it got in if nothing changes', () => {
    const {
      calls: [[arg]],
    } = onUpdate.mock;

    expect(arg.getData()).toEqual(testProcessors);
  });

  describe('processors', () => {
    it('adds a new processor', async () => {
      const { actions } = testBed;
      await actions.addProcessor('processors', 'test', { if: '1 == 1' });
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(3);
      const [a, b, c] = processors;
      expect(a).toEqual(testProcessors.processors[0]);
      expect(b).toEqual(testProcessors.processors[1]);
      expect(c).toEqual({ test: { if: '1 == 1' } });
    });

    it('removes a processor', () => {
      const { actions } = testBed;
      // processor>0 denotes the first processor in the top-level processors array.
      actions.removeProcessor('processors>0');
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(1);
      expect(processors[0]).toEqual({
        gsub: {
          field: '_index',
          pattern: '(.monitoring-\\w+-)6(-.+)',
          replacement: '$17$2',
        },
      });
    });

    it('reorders processors', () => {
      const { actions } = testBed;
      actions.moveProcessor('processors>0', 'dropButtonBelow-processors>1');
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors).toEqual(testProcessors.processors.slice(0).reverse());
    });

    it('adds an on-failure processor to a processor', async () => {
      const { actions, find, exists } = testBed;
      const processorSelector = 'processors>1';
      await actions.addOnFailureProcessor(processorSelector, 'test', { if: '1 == 2' });
      // Assert that the add on failure button has been removed
      find(`${processorSelector}.moreMenu.button`).simulate('click');
      expect(!exists(`${processorSelector}.moreMenu.addOnFailureButton`));
      // Assert that the add processor button is now visible
      expect(exists(`${processorSelector}.addProcessor`));
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(2);
      expect(processors[0]).toEqual(testProcessors.processors[0]); // should be unchanged
      expect(processors[1].gsub).toEqual({
        ...testProcessors.processors[1].gsub,
        on_failure: [{ test: { if: '1 == 2' } }],
      });
    });

    it('moves a processor to a nested dropzone', async () => {
      const { actions } = testBed;
      await actions.addOnFailureProcessor('processors>1', 'test', { if: '1 == 3' });
      actions.moveProcessor('processors>0', 'dropButtonBelow-processors>1>onFailure>0');
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(1);
      expect(processors[0].gsub.on_failure).toEqual([
        {
          test: { if: '1 == 3' },
        },
        testProcessors.processors[0],
      ]);
    });

    it('duplicates a processor', async () => {
      const { actions } = testBed;
      await actions.addOnFailureProcessor('processors>1', 'test', { if: '1 == 4' });
      actions.duplicateProcessor('processors>1');
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(3);
      const duplicatedProcessor = {
        gsub: {
          ...testProcessors.processors[1].gsub,
          on_failure: [{ test: { if: '1 == 4' } }],
        },
      };
      expect(processors).toEqual([
        testProcessors.processors[0],
        duplicatedProcessor,
        duplicatedProcessor,
      ]);
    });

    it('can cancel a move', () => {
      const { actions, exists } = testBed;
      const processorSelector = 'processors>0';
      actions.startAndCancelMove(processorSelector);
      // Assert that we have exited move mode for this processor
      expect(exists(`${processorSelector}.moveItemButton`)).toBe(true);
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      // Assert that nothing has changed
      expect(processors).toEqual(testProcessors.processors);
    });

    it('moves to and from the global on-failure tree', async () => {
      const { actions } = testBed;
      await actions.addProcessor('onFailure', 'test', { if: '1 == 5' });
      actions.moveProcessor('processors>0', 'dropButtonBelow-onFailure>0');
      const [onUpdateResult1] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data1 = onUpdateResult1.getData();
      expect(data1.processors.length).toBe(1);
      expect(data1.on_failure.length).toBe(2);
      expect(data1.processors).toEqual([testProcessors.processors[1]]);
      expect(data1.on_failure).toEqual([{ test: { if: '1 == 5' } }, testProcessors.processors[0]]);
      actions.moveProcessor('onFailure>1', 'dropButtonAbove-processors>0');
      const [onUpdateResult2] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data2 = onUpdateResult2.getData();
      expect(data2.processors.length).toBe(2);
      expect(data2.on_failure.length).toBe(1);
      expect(data2.processors).toEqual(testProcessors.processors);
      expect(data2.on_failure).toEqual([{ test: { if: '1 == 5' } }]);
    });
  });
});
