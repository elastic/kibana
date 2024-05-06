/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { SelectInferenceId } from './select_inference_id';

const onChangeMock = jest.fn();
const setValueMock = jest.fn();

jest.mock('../../../../../app_context', () => ({
  useAppContext: jest.fn().mockReturnValue({
    core: { application: {} },
    docLinks: {},
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getTrainedModels: jest.fn().mockResolvedValue([]),
          },
        },
      },
    },
  }),
}));

describe('SelectInferenceId', () => {
  let exists: any;
  let find: any;

  beforeAll(async () => {
    const setup = registerTestBed(SelectInferenceId, {
      defaultProps: {
        onChange: onChangeMock,
        'data-test-subj': 'data-inference-endpoint-list',
        setValue: setValueMock,
      },
      memoryRouter: { wrapComponent: false },
    });

    await act(async () => {
      const testBed = setup();
      exists = testBed.exists;
      find = testBed.find;
    });
  });

  it('should display the select inference endpoint combo', () => {
    expect(exists('selectInferenceId')).toBe(true);
  });

  it('should contain the buttons for InferenceEndpoint management', () => {
    find('inferenceIdButton').simulate('click');
    expect(exists('addInferenceEndpointButton')).toBe(true);
    expect(exists('manageInferenceEndpointButton')).toBe(true);
  });

  it('should display the inference endpoints in the combo', () => {
    find('inferenceIdButton').simulate('click');
    expect(find('data-inference-endpoint-list').contains('e5')).toBe(true);
    expect(find('data-inference-endpoint-list').contains('elser_model_2')).toBe(true);
  });
});
