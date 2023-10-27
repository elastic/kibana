/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: any) => fn,
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  const CodeEditorMock = (props: any) => (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-currentvalue={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
      }}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { LoadMappingsProvider } from './load_mappings_provider';

const ComponentToTest = ({ onJson }: { onJson: () => void }) => (
  <KibanaContextProvider services={{ uiSettings: uiSettingsServiceMock.createSetupContract() }}>
    <LoadMappingsProvider onJson={onJson} esNodesPlugins={[]}>
      {(openModal) => (
        <button onClick={openModal} data-test-subj="load-json-button">
          Load JSON
        </button>
      )}
    </LoadMappingsProvider>
  </KibanaContextProvider>
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

    find('mockCodeEditor').getDOMNode().setAttribute('data-currentvalue', JSON.stringify(json));
    find('mockCodeEditor').simulate('change');
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
