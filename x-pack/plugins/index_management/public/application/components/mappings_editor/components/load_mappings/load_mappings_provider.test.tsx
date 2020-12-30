/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj="mockCodeEditor"
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: any) => fn,
  };
});

import { registerTestBed, TestBed } from '@kbn/test/jest';
import { LoadMappingsProvider } from './load_mappings_provider';

const ComponentToTest = ({ onJson }: { onJson: () => void }) => (
  <LoadMappingsProvider onJson={onJson}>
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

const openModalWithJsonContent = ({ component, find }: TestBed) => (json: any) => {
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

  test('it should detect custom single-type mappings and return it', async () => {
    const mappingsToLoadOneType = {
      myCustomType: {
        _source: {
          enabled: true,
        },
        properties: {
          title: {
            type: 'text',
          },
        },
        dynamic_templates: [],
      },
    };

    const onJson = jest.fn();
    const testBed = await setup({ onJson });

    await openModalWithJsonContent(testBed)(mappingsToLoadOneType);

    // Confirm
    testBed.find('confirmModalConfirmButton').simulate('click');

    const [jsonReturned] = onJson.mock.calls[0];
    expect(jsonReturned).toEqual(mappingsToLoadOneType);
  });

  test('it should detect multi-type mappings and return raw without validating', async () => {
    const mappingsToLoadMultiType = {
      myCustomType1: {
        wrongParameter: 'wont be validated neither stripped out',
        properties: {
          title: {
            type: 'wrongType',
          },
        },
        dynamic_templates: [],
      },
      myCustomType2: {
        properties: {
          title: {
            type: 'text',
          },
        },
        dynamic_templates: [],
      },
    };

    const onJson = jest.fn();
    const testBed = await setup({ onJson });

    await openModalWithJsonContent(testBed)(mappingsToLoadMultiType);

    // Confirm
    testBed.find('confirmModalConfirmButton').simulate('click');

    const [jsonReturned] = onJson.mock.calls[0];
    expect(jsonReturned).toEqual(mappingsToLoadMultiType);
  });

  test('it should detect single-type mappings under a valid mappings definition parameter', async () => {
    const mappingsToLoadOneType = {
      // Custom type name _is_ a valid mappings definition parameter
      _source: {
        _source: {
          enabled: true,
        },
        properties: {
          title: {
            type: 'text',
          },
        },
        dynamic_templates: [],
      },
    };

    const onJson = jest.fn();
    const testBed = await setup({ onJson });

    await openModalWithJsonContent(testBed)(mappingsToLoadOneType);

    // Confirm
    testBed.find('confirmModalConfirmButton').simulate('click');

    const [jsonReturned] = onJson.mock.calls[0];
    expect(jsonReturned).toEqual(mappingsToLoadOneType);
  });

  test('should treat "properties" as properties definition and **not** as a cutom type', async () => {
    const mappingsToLoadOneType = {
      // Custom type name _is_ a valid mappings definition parameter
      properties: {
        _source: {
          enabled: true,
        },
        properties: {
          title: {
            type: 'text',
          },
        },
        dynamic_templates: [],
      },
    };

    const onJson = jest.fn();
    const testBed = await setup({ onJson });

    await openModalWithJsonContent(testBed)(mappingsToLoadOneType);

    // Confirm
    testBed.find('confirmModalConfirmButton').simulate('click');

    // Make sure our handler hasn't been called
    expect(onJson.mock.calls.length).toBe(0);
  });
});
