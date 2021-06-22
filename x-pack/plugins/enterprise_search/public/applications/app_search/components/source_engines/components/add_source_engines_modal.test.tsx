/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiButtonEmpty, EuiComboBox, EuiModal } from '@elastic/eui';

import { AddSourceEnginesModal } from './add_source_engines_modal';

describe('AddSourceEnginesModal', () => {
  const MOCK_VALUES = {
    selectableEngineNames: ['source-engine-1', 'source-engine-2', 'source-engine-3'],
    selectedEngineNamesToAdd: ['source-engine-2'],
    modalLoading: false,
  };

  const MOCK_ACTIONS = {
    addSourceEngines: jest.fn(),
    closeModal: jest.fn(),
    onAddEnginesSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('calls closeAddSourceEnginesModal when the modal is closed', () => {
    const wrapper = shallow(<AddSourceEnginesModal />);
    wrapper.find(EuiModal).simulate('close');

    expect(MOCK_ACTIONS.closeModal).toHaveBeenCalled();
  });

  describe('combo box', () => {
    it('has the proper options and selected options', () => {
      const wrapper = shallow(<AddSourceEnginesModal />);

      expect(wrapper.find(EuiComboBox).prop('options')).toEqual([
        { label: 'source-engine-1' },
        { label: 'source-engine-2' },
        { label: 'source-engine-3' },
      ]);
      expect(wrapper.find(EuiComboBox).prop('selectedOptions')).toEqual([
        { label: 'source-engine-2' },
      ]);
    });

    it('calls setSelectedEngineNamesToAdd when changed', () => {
      const wrapper = shallow(<AddSourceEnginesModal />);
      wrapper.find(EuiComboBox).simulate('change', [{ label: 'source-engine-3' }]);

      expect(MOCK_ACTIONS.onAddEnginesSelection).toHaveBeenCalledWith(['source-engine-3']);
    });
  });

  describe('cancel button', () => {
    it('calls closeModal when clicked', () => {
      const wrapper = shallow(<AddSourceEnginesModal />);
      wrapper.find(EuiButtonEmpty).simulate('click');

      expect(MOCK_ACTIONS.closeModal).toHaveBeenCalled();
    });
  });

  describe('save button', () => {
    it('is disabled when user has selected no engines', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedEngineNamesToAdd: [],
      });
      const wrapper = shallow(<AddSourceEnginesModal />);

      expect(wrapper.find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('passes modalLoading state', () => {
      setMockValues({
        ...MOCK_VALUES,
        modalLoading: true,
      });
      const wrapper = shallow(<AddSourceEnginesModal />);

      expect(wrapper.find(EuiButton).prop('isLoading')).toEqual(true);
    });

    it('calls addSourceEngines when clicked', () => {
      const wrapper = shallow(<AddSourceEnginesModal />);
      wrapper.find(EuiButton).simulate('click');

      expect(MOCK_ACTIONS.addSourceEngines).toHaveBeenCalled();
    });
  });
});
