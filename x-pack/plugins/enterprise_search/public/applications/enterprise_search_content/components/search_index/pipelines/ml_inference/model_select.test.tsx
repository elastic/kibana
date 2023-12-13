/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSelectable } from '@elastic/eui';

import { ModelSelect } from './model_select';

const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: {},
  },
  selectableModels: [
    {
      modelId: 'model_1',
    },
    {
      modelId: 'model_2',
    },
  ],
  indexName: 'my-index',
};
const MOCK_ACTIONS = {
  setInferencePipelineConfiguration: jest.fn(),
};

describe('ModelSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
    setMockActions(MOCK_ACTIONS);
  });
  it('renders model select with no options', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      selectableModels: null,
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')).toEqual([]);
  });
  it('renders model select with options', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')).toEqual([
      {
        modelId: 'model_1',
        label: 'model_1',
      },
      {
        modelId: 'model_2',
        label: 'model_2',
      },
    ]);
  });
  it('selects the chosen option', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          ...DEFAULT_VALUES.addInferencePipelineModal.configuration,
          modelID: 'model_2',
        },
      },
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')[1].checked).toEqual('on');
  });
  it('sets model ID on selecting an item and clears config', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [{ modelId: 'model_1' }, { modelId: 'model_2', checked: 'on' }]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        inferenceConfig: undefined,
        modelID: 'model_2',
        fieldMappings: undefined,
      })
    );
  });
  it('sets placeholder flag on selecting a placeholder item', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [
      { modelId: 'model_1' },
      { modelId: 'model_2', isPlaceholder: true, checked: 'on' },
    ]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        modelID: 'model_2',
        isModelPlaceholderSelected: true,
      })
    );
  });
  it('generates pipeline name on selecting an item', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [{ modelId: 'model_1' }, { modelId: 'model_2', checked: 'on' }]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineName: 'my-index-model_2',
      })
    );
  });
  it('does not generate pipeline name on selecting an item if it a name was supplied by the user', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          ...DEFAULT_VALUES.addInferencePipelineModal.configuration,
          pipelineName: 'user-pipeline',
          isPipelineNameUserSupplied: true,
        },
      },
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [{ modelId: 'model_1' }, { modelId: 'model_2', checked: 'on' }]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineName: 'user-pipeline',
      })
    );
  });
});
