/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import '../../../../../../../../../src/plugins/es_ui_shared/public/components/code_editor/jest_mock';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: any) => fn,
  };
});

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { LoadMappingsProvider } from './load_mappings_provider';

const ComponentToTest = ({ onJson }: { onJson: () => void }) => (
  <LoadMappingsProvider onJson={onJson} esNodesPlugins={[]}>
    {(openModal) => (
      <button onClick={openModal} data-test-subj="load-json-button">
        Load JSON
      </button>
    )}
  </LoadMappingsProvider>
);

const setup = (props: any) =>
  registerTestBed(ComponentToTest, {
    memoryRouter: { wrapComponent: false },
    defaultProps: props,
  })();

const openModalWithJsonContent =
  ({ component, find }: TestBed) =>
  (json: any) => {
    act(() => {
      find('load-json-button').simulate('click');
    });

    component.update();

    act(() => {
      // Set the mappings to load
      find('mockCodeEditor').simulate('change', {
        jsonString: JSON.stringify(json),
      });
    });
  };

describe('<LoadMappingsProvider />', () => {
  test('it should forward valid mapping definition', () => {
    const mappingsToLoad = {
      properties: {
        title: {
          type: 'text',
        },
      },
    };

    const onJson = jest.fn();
    const testBed = setup({ onJson }) as TestBed;

    // Open the modal and add the JSON
    openModalWithJsonContent(testBed)(mappingsToLoad);

    // Confirm
    testBed.find('confirmModalConfirmButton').simulate('click');

    const [jsonReturned] = onJson.mock.calls[0];
    expect(jsonReturned).toEqual({ ...mappingsToLoad, dynamic_templates: [] });
  });
});
