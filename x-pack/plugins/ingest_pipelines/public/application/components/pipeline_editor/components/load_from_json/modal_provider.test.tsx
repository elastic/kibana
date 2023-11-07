/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ModalProvider, OnDoneLoadJsonHandler } from './modal_provider';

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
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
        }}
      />
    ),
  };
});

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';

const setup = ({ onDone }: { onDone: OnDoneLoadJsonHandler }) => {
  return registerTestBed(
    () => (
      <KibanaContextProvider services={{ uiSettings: uiSettingsServiceMock.createSetupContract() }}>
        <ModalProvider onDone={onDone}>
          {(openModal) => {
            return (
              <button onClick={openModal} data-test-subj="button">
                Load JSON
              </button>
            );
          }}
        </ModalProvider>
      </KibanaContextProvider>
    ),
    {
      memoryRouter: {
        wrapComponent: false,
      },
    }
  )();
};

describe('Load from JSON ModalProvider', () => {
  let testBed: TestBed;
  let onDone: jest.Mock;

  beforeEach(async () => {
    onDone = jest.fn();
    testBed = await setup({ onDone });
  });

  it('displays errors', () => {
    const { find, exists } = testBed;
    find('button').simulate('click');
    expect(exists('loadJsonConfirmationModal'));
    const invalidPipeline = '{}';
    find('mockCodeEditor').simulate('change', { jsonString: invalidPipeline });
    find('confirmModalConfirmButton').simulate('click');
    const errorCallout = find('loadJsonConfirmationModal.errorCallOut');
    expect(errorCallout.text()).toContain('Please ensure the JSON is a valid pipeline object.');
    expect(onDone).toHaveBeenCalledTimes(0);
  });

  it('passes through a valid pipeline object', () => {
    const { find, exists } = testBed;
    find('button').simulate('click');
    expect(exists('loadJsonConfirmationModal'));
    const validPipeline = JSON.stringify({
      processors: [{ set: { field: 'test', value: 123 } }, { badType1: null }, { badType2: 1 }],
      on_failure: [
        {
          gsub: {
            field: '_index',
            pattern: '(.monitoring-\\w+-)6(-.+)',
            replacement: '$17$2',
          },
        },
      ],
    });
    // Set the value of the mock code editor
    find('mockCodeEditor').getDOMNode().setAttribute('data-currentvalue', validPipeline);
    find('mockCodeEditor').simulate('change');

    find('confirmModalConfirmButton').simulate('click');
    expect(!exists('loadJsonConfirmationModal'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "on_failure": Array [
          Object {
            "gsub": Object {
              "field": "_index",
              "pattern": "(.monitoring-\\\\w+-)6(-.+)",
              "replacement": "$17$2",
            },
          },
        ],
        "processors": Array [
          Object {
            "set": Object {
              "field": "test",
              "value": 123,
            },
          },
          Object {
            "badType1": null,
          },
          Object {
            "badType2": 1,
          },
        ],
      }
    `);
  });
});
