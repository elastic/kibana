/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, nextTick, getRandomString } from '../helpers';
import { getFieldConfig } from '../../../lib';

const { setup, expectDataUpdatedFactory } = componentHelpers.mappingsEditor;
const onUpdateHandler = jest.fn();
const expectDataUpdated = expectDataUpdatedFactory(onUpdateHandler);

const allProps = {
  type: 'text',
  index: true,
  analyzer: 'standard',
  search_quote_analyzer: 'simple',
  eager_global_ordinals: false,
  index_phrases: false,
  norms: true,
  fielddata: false,
  store: false,
  index_options: 'positions',
  search_analyzer: 'whitespace',
};

describe('text datatype', () => {
  const defaultMappings = {
    properties: {
      user: {
        properties: {
          address: {
            properties: {
              street: { type: 'text' },
            },
          },
        },
      },
    },
  };
  let testBed: MappingsEditorTestBed;

  beforeEach(async () => {
    testBed = await setup({ defaultValue: defaultMappings, onUpdate() {} });

    // We edit the field (by opening the flyout)
    await act(async () => {
      await testBed.actions.startEditField('user.address.street');
    });
  });

  afterEach(() => {
    onUpdateHandler.mockReset();
  });

  test('flyout details initial view', async () => {
    const {
      find,
      actions: { getToggleValue, showAdvancedSettings },
    } = testBed;
    const fieldPath = ['user', 'address', 'street'];
    const fieldName = fieldPath[fieldPath.length - 1];

    // It should have the correct title
    expect(find('mappingsEditorFieldEdit.flyoutTitle').text()).toEqual(`Edit field '${fieldName}'`);

    // It should have the correct field path
    expect(find('mappingsEditorFieldEdit.fieldPath').text()).toEqual(fieldPath.join(' > '));

    // It should have searchable ("index" param) active by default
    const indexFieldConfig = getFieldConfig('index');
    expect(getToggleValue('indexParameter.formRowToggle')).toBe(indexFieldConfig.defaultValue);

    // The advanced settings should be hidden initially
    expect(find('mappingsEditorFieldEdit.advancedSettings').props().style.display).toEqual('none');

    await showAdvancedSettings();
  });
});
