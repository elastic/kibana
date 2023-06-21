/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const GEO_GRID_TYPE = 'geo_grid';

describe('Processor: GeoGrid', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  const { httpSetup } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();

    await act(async () => {
      testBed = await setup(httpSetup, {
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
    });

    const { component, actions } = testBed;

    component.update();

    // Open flyout to add new processor
    actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await actions.addProcessorType(GEO_GRID_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is a required parameter
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.', // "Field" input
      'A tile type value is required.', // "Tile type" input
    ]);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_geo_grid_processor');

    // Add "tile tyle" field
    form.setSelectValue('tileTypeField', 'geohex');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, GEO_GRID_TYPE);

    expect(processors[0][GEO_GRID_TYPE]).toEqual(
      expect.objectContaining({
        field: 'test_geo_grid_processor',
        tile_type: 'geohex',
      })
    );
  });

  test('saves with optional parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add required fields
    form.setInputValue('fieldNameField.input', 'test_geo_grid_processor');
    form.setSelectValue('tileTypeField', 'geohex');

    // Add optional fields
    form.setInputValue('targetField.input', 'test_target');
    form.setSelectValue('targetFormatField', 'WKT');
    form.setInputValue('parentField.input', 'parent_field');
    form.setInputValue('childrenField.input', 'children_field');
    form.setInputValue('nonChildrenField.input', 'nonchildren_field');
    form.setInputValue('precisionField.input', 'precision_field');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, GEO_GRID_TYPE);

    expect(processors[0][GEO_GRID_TYPE]).toEqual({
      field: 'test_geo_grid_processor',
      tile_type: 'geohex',
      target_field: 'test_target',
      target_format: 'WKT',
      parent_field: 'parent_field',
      children_field: 'children_field',
      non_children_field: 'nonchildren_field',
      precision_field: 'precision_field',
    });
  });
});
