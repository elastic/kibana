/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Form,
  useForm,
} from '../../../public/application/components/mappings_editor/shared_imports';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import {
  SelectInferenceId,
  SelectInferenceIdProps,
} from '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id';
import React from 'react';

const createInferenceEndpointMock = jest.fn();
const mockDispatch = jest.fn();

jest.mock('../../../public/application/app_context', () => ({
  useAppContext: jest.fn().mockReturnValue({
    core: { application: {} },
    docLinks: {},
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getTrainedModels: jest.fn().mockResolvedValue([]),
            getTrainedModelStats: jest.fn().mockResolvedValue([]),
          },
        },
      },
    },
  }),
}));

jest.mock(
  '../../../public/application/components/component_templates/component_templates_context',
  () => ({
    useComponentTemplatesContext: jest.fn().mockReturnValue({
      toasts: {
        addError: jest.fn(),
        addSuccess: jest.fn(),
      },
    }),
  })
);

jest.mock('../../../public/application/components/mappings_editor/mappings_state_context', () => ({
  useMappingsState: () => ({ inferenceToModelIdMap: {} }),
  useDispatch: () => mockDispatch,
}));

function getTestForm(Component: React.FC<SelectInferenceIdProps>) {
  return (defaultProps: SelectInferenceIdProps) => {
    const { form } = useForm();
    form.setFieldValue('inference_id', 'elser_model_2');
    return (
      <Form form={form}>
        <Component {...(defaultProps as any)} />
      </Form>
    );
  };
}

describe('SelectInferenceId', () => {
  let exists: any;
  let find: any;

  beforeAll(async () => {
    const defaultProps: SelectInferenceIdProps = {
      'data-test-subj': 'data-inference-endpoint-list',
      createInferenceEndpoint: createInferenceEndpointMock,
    };
    const setup = registerTestBed(getTestForm(SelectInferenceId), {
      defaultProps,
      memoryRouter: { wrapComponent: false },
    });

    await act(async () => {
      const testBed = await setup();
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
