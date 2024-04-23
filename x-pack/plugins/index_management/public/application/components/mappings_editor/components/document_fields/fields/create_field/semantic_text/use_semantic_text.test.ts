/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { FormHook } from '../../../../../shared_imports';
import { Field } from '../../../../../types';
import { useSemanticText } from './use_semantic_text';

const mockDispatch = jest.fn();

jest.mock('../../../../../mappings_state_context', () => ({
  useMappingsState: jest.fn().mockReturnValue({
    inferenceToModelIdMap: {
      e5: {
        defaultInferenceEndpoint: false,
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.multilingual-e5-small',
      },
      elser_model_2: {
        defaultInferenceEndpoint: true,
        isDeployed: true,
        isDeployable: true,
        trainedModelId: '.elser_model_2',
      },
    },
  }),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

describe('useSemanticText', () => {
  let form: any;

  beforeEach(() => {
    form = {
      getFields: jest.fn().mockReturnValue({
        referenceField: { value: 'title' },
        name: { value: 'sem' },
        type: { value: [{ value: 'semantic_text' }] },
        inferenceId: { value: 'e5' },
      }),
    } as unknown as FormHook<Field, Field>;
  });

  it('should populate the values from the form', () => {
    const { result } = renderHook(() =>
      useSemanticText({ form, setErrorsInTrainedModelDeployment: jest.fn(), ml: undefined })
    );

    expect(result.current.referenceFieldComboValue).toBe('title');
    expect(result.current.nameValue).toBe('sem');
    expect(result.current.inferenceIdComboValue).toBe('e5');
    expect(result.current.semanticFieldType).toBe('semantic_text');
  });
});
