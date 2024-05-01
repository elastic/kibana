/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { setup, SetupResult } from './pipeline_processors_editor.helpers';
import { Pipeline } from '../../../../../common/types';
import {
  extractProcessorDetails,
  getProcessorTypesAndLabels,
  groupProcessorsByCategory,
} from '../components/processor_form/processors/common_fields/processor_type_field';
import { mapProcessorTypeToDescriptor } from '../components/shared/map_processor_type_to_form';

const testProcessors: Pick<Pipeline, 'processors'> = {
  processors: [
    {
      script: {
        source: 'ctx._type = null',
        description: 'my script',
      },
    },
    {
      gsub: {
        field: '_index',
        pattern: '(.monitoring-\\w+-)6(-.+)',
        replacement: '$17$2',
      },
    },
    {
      set: {
        field: 'test',
        value: 'test',
        unknown_field_foo: 'unknown_value',
      },
    },
  ],
};

describe('Pipeline Editor', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
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
    });
  });

  it('provides the same data out it got in if nothing changes', () => {
    const {
      calls: [[arg]],
    } = onUpdate.mock;

    expect(arg.getData()).toEqual(testProcessors);
  });

  describe('no processors', () => {
    beforeEach(async () => {
      testBed = await setup({
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
    });

    it('displays an empty prompt if no processors are defined', () => {
      const { exists } = testBed;
      expect(exists('processorsEmptyPrompt')).toBe(true);
    });
  });

  describe('processors', () => {
    it('adds a new processor', async () => {
      const { actions } = testBed;
      await actions.addProcessor('processors', 'test', { if: '1 == 1' });
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(4);
      const [a, b, c, d] = processors;
      expect(a).toEqual(testProcessors.processors[0]);
      expect(b).toEqual(testProcessors.processors[1]);
      expect(c).toEqual(testProcessors.processors[2]);
      expect(d).toEqual({ test: { if: '1 == 1' } });
    });

    it('Shows inference and redact processors for licenses > platinum', async () => {
      const basicLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'basic' },
      });
      const platinumLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'platinum' },
      });

      // Get the list of processors that are only available for platinum licenses
      const processorsForPlatinumLicense = extractProcessorDetails(mapProcessorTypeToDescriptor)
        .filter((processor) => processor.forLicenseAtLeast === 'platinum')
        .map(({ value, label, category }) => ({ label, value, category }));

      // Check that the list of processors for platinum licenses is not included in the list of processors for basic licenses
      expect(getProcessorTypesAndLabels(basicLicense)).toEqual(
        expect.not.arrayContaining(processorsForPlatinumLicense)
      );
      expect(getProcessorTypesAndLabels(platinumLicense)).toEqual(
        expect.arrayContaining(processorsForPlatinumLicense)
      );
    });

    it('knows how to group processors by category', () => {
      const platinumLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'platinum' },
      });

      const processors = getProcessorTypesAndLabels(platinumLicense);
      const groupedProcessors = groupProcessorsByCategory(processors);

      for (let x = 0; x < groupedProcessors.length; x++) {
        expect(groupedProcessors[x].label).not.toBeUndefined();
        expect(groupedProcessors[x].options.length).toBeGreaterThan(0);
      }
    });

    it('edits a processor without removing unknown processor.options', async () => {
      const { actions, exists, form } = testBed;
      // Open the edit processor form for the set processor
      actions.openProcessorEditor('processors>2');
      expect(exists('editProcessorForm')).toBeTruthy();
      form.setInputValue('editProcessorForm.valueFieldInput', 'test44');
      jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      await actions.submitProcessorForm();
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const {
        processors: { 2: setProcessor },
      } = onUpdateResult.getData();
      // The original field should still be unchanged
      expect(testProcessors.processors[2].set.value).toBe('test');
      expect(setProcessor.set).toEqual({
        description: undefined,
        field: 'test',
        ignore_empty_value: undefined,
        ignore_failure: undefined,
        override: undefined,
        // This unknown_field is not supported in the form
        unknown_field_foo: 'unknown_value',
        value: 'test44',
      });
    });

    it('allows to edit an existing processor and change its type', async () => {
      const { actions, exists, component, find } = testBed;

      // Open one of the existing processors
      actions.openProcessorEditor('processors>2');
      expect(exists('editProcessorForm')).toBeTruthy();

      // Change its type to `append` and set the missing required fields
      await actions.setProcessorType('append');
      await act(async () => {
        find('appendValueField.input').simulate('change', [{ label: 'some_value' }]);
      });
      component.update();

      await actions.submitProcessorForm();

      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const {
        processors: { 2: editedProcessor },
      } = onUpdateResult.getData();

      expect(editedProcessor.append).toEqual({
        if: undefined,
        tag: undefined,
        description: undefined,
        ignore_failure: undefined,
        field: 'test',
        value: ['some_value'],
      });
    });

    it('removes a processor', () => {
      const { actions } = testBed;
      // processor>0 denotes the first processor in the top-level processors array.
      actions.removeProcessor('processors>0');
      const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const { processors } = onUpdateResult.getData();
      expect(processors.length).toBe(2);
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
      expect(processors).toEqual([
        testProcessors.processors[1],
        testProcessors.processors[0],
        testProcessors.processors[2],
      ]);
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
      expect(processors.length).toBe(3);
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
      expect(processors.length).toBe(2);
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
      expect(processors.length).toBe(4);
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
        testProcessors.processors[2],
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
      expect(data1.processors.length).toBe(2);
      expect(data1.on_failure.length).toBe(2);
      expect(data1.processors).toEqual([
        testProcessors.processors[1],
        testProcessors.processors[2],
      ]);
      expect(data1.on_failure).toEqual([{ test: { if: '1 == 5' } }, testProcessors.processors[0]]);
      actions.moveProcessor('onFailure>1', 'dropButtonAbove-processors>0');
      const [onUpdateResult2] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data2 = onUpdateResult2.getData();
      expect(data2.processors.length).toBe(3);
      expect(data2.on_failure.length).toBe(1);
      expect(data2.processors).toEqual(testProcessors.processors);
      expect(data2.on_failure).toEqual([{ test: { if: '1 == 5' } }]);
    });

    it('prevents moving a processor while in edit mode', () => {
      const { find, exists } = testBed;
      find('processors>0.manageItemButton').simulate('click');
      expect(exists('editProcessorForm')).toBe(true);
      expect(find('processors>0.moveItemButton').props().disabled).toBe(true);
      expect(find('processors>1.moveItemButton').props().disabled).toBe(true);
    });

    it('can move a processor into an empty tree', () => {
      const { actions } = testBed;
      actions.moveProcessor('processors>0', 'onFailure.dropButtonEmptyTree');
      const [onUpdateResult2] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      const data = onUpdateResult2.getData();
      expect(data.processors).toEqual([testProcessors.processors[1], testProcessors.processors[2]]);
      expect(data.on_failure).toEqual([testProcessors.processors[0]]);
    });

    it('shows user provided descriptions rather than default descriptions and default descriptions rather than no description', async () => {
      const { actions, find } = testBed;

      await actions.addProcessor('processors', 'test', { if: '1 == 1' });

      const processorDescriptions = {
        userProvided: 'my script',
        default: 'Sets value of "test" to "test"',
        none: 'No description',
      };

      const createAssertForProcessor =
        (processorIndex: string) =>
        ({
          description,
          descriptionVisible,
        }: {
          description: string;
          descriptionVisible: boolean;
        }) => {
          expect(find(`processors>${processorIndex}.inlineTextInputNonEditableText`).text()).toBe(
            description
          );
          expect(
            (
              find(`processors>${processorIndex}.pipelineProcessorItemDescriptionContainer`).props()
                .className as string
            ).includes('--displayNone')
          ).toBe(!descriptionVisible);
        };

      const assertScriptProcessor = createAssertForProcessor('0');
      const assertSetProcessor = createAssertForProcessor('2');
      const assertTestProcessor = createAssertForProcessor('3');

      assertScriptProcessor({
        description: processorDescriptions.userProvided,
        descriptionVisible: true,
      });

      assertSetProcessor({
        description: processorDescriptions.default,
        descriptionVisible: true,
      });

      assertTestProcessor({ description: processorDescriptions.none, descriptionVisible: true });

      // Enter "move" mode
      find('processors>0.moveItemButton').simulate('click');

      // We expect that descriptions remain exactly the same, but the processor with "No description" has
      // its description hidden
      assertScriptProcessor({
        description: processorDescriptions.userProvided,
        descriptionVisible: true,
      });

      assertSetProcessor({
        description: processorDescriptions.default,
        descriptionVisible: true,
      });

      assertTestProcessor({ description: processorDescriptions.none, descriptionVisible: false });
    });
  });
});
