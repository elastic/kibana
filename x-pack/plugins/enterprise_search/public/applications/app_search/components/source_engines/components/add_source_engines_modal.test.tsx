/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton, EuiButtonEmpty, EuiComboBox, EuiModal } from '@elastic/eui';

import { AddSourceEnginesModal } from './add_source_engines_modal';

const MOCK_VALUES = {
  // SouceEnginesLogic
  selectableEngineNames: ['source-engine-1', 'source-engine-2', 'source-engine-3'],
  selectedEngineNamesToAdd: ['source-engine-2'],
};

const MOCK_ACTIONS = {
  // SourceEnginesLogic
  addSourceEngines: jest.fn(),
  closeAddSourceEnginesModal: jest.fn(),
  onAddEnginesSelection: jest.fn(),
};

describe('AddSourceEnginesModal', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
    wrapper = shallow(<AddSourceEnginesModal />);
  });

  it('calls closeAddSourceEnginesModal when the modal is closed', () => {
    wrapper.find(EuiModal).simulate('close');

    expect(MOCK_ACTIONS.closeAddSourceEnginesModal).toHaveBeenCalled();
  });

  describe('combo box', () => {
    it('has the proper options and selected options', () => {
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
      wrapper.find(EuiComboBox).simulate('change', [{ label: 'source-engine-3' }]);

      expect(MOCK_ACTIONS.onAddEnginesSelection).toHaveBeenCalledWith(['source-engine-3']);
    });
  });

  describe('cancel button', () => {
    it('calls closeAddSourceEnginesModal when clicked', () => {
      wrapper.find(EuiButtonEmpty).simulate('click');

      expect(MOCK_ACTIONS.closeAddSourceEnginesModal).toHaveBeenCalled();
    });
  });

  describe('save button', () => {
    it('is disabled when user has selected no engines', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedEngineNamesToAdd: [],
      });
      wrapper = shallow(<AddSourceEnginesModal />);

      expect(wrapper.find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('calls addSourceEngines when clicked', () => {
      wrapper.find(EuiButton).simulate('click');

      expect(MOCK_ACTIONS.addSourceEngines).toHaveBeenCalled();
    });
  });
});
