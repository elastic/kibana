/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiModal } from '@elastic/eui';

import { MultiInputRows } from '../../multi_input_rows';

import { SynonymModal } from '.';

describe('SynonymModal', () => {
  const MOCK_SYNONYM_SET = {
    id: 'syn-1234567890',
    synonyms: ['a', 'b', 'c'],
  };
  const values = {
    isModalOpen: true,
    modalLoading: false,
  };
  const actions = {
    closeModal: jest.fn(),
    createSynonymSet: jest.fn(),
    updateSynonymSet: jest.fn(),
    deleteSynonymSet: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a modal', () => {
    const wrapper = shallow(<SynonymModal />);

    wrapper.find(EuiModal).simulate('close');
    expect(actions.closeModal).toHaveBeenCalled();
  });

  it('renders a form submit button with a loading state', () => {
    setMockValues({ ...values, modalLoading: true });
    const wrapper = shallow(<SynonymModal />);

    expect(wrapper.find('[data-test-subj="submitSynonymSetButton"]').prop('isLoading')).toBe(true);
  });

  describe('new synonym set', () => {
    setMockActions(actions);
    setMockValues({ ...values, activeSynonymSet: null });
    const wrapper = shallow(<SynonymModal />);

    it('renders', () => {
      expect(wrapper.find('h1').text()).toEqual('Add a synonym set');
    });

    it('populates MultiInputRows with two empty rows', () => {
      expect(wrapper.find(MultiInputRows).prop('id')).toEqual('createNewSynonymSet');
      expect(wrapper.find(MultiInputRows).prop('initialValues')).toEqual(['', '']);
    });

    it('calls createSynonymSet on submit', () => {
      wrapper.find(MultiInputRows).simulate('submit', ['new', 'synonyms']);

      expect(actions.createSynonymSet).toHaveBeenCalledWith(['new', 'synonyms']);
    });

    it('does not render a delete button', () => {
      expect(wrapper.find('[data-test-subj="deleteSynonymSetButton"]')).toHaveLength(0);
    });
  });

  describe('existing synonym set', () => {
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      setMockValues({ ...values, activeSynonymSet: MOCK_SYNONYM_SET });
      wrapper = shallow(<SynonymModal />);
    });

    it('renders', () => {
      expect(wrapper.find('h1').text()).toEqual('Manage synonym set');
    });

    it('populates MultiInputRows with ID & initial values', () => {
      expect(wrapper.find(MultiInputRows).prop('id')).toEqual('syn-1234567890');
      expect(wrapper.find(MultiInputRows).prop('initialValues')).toEqual(['a', 'b', 'c']);
    });

    it('calls updateSynonymSet on submit', () => {
      wrapper.find(MultiInputRows).simulate('submit', ['updated', 'synonyms']);

      expect(actions.updateSynonymSet).toHaveBeenCalledWith({
        id: 'syn-1234567890',
        synonyms: ['updated', 'synonyms'],
      });
    });

    it('renders a delete button', () => {
      const confirmSpy = jest.spyOn(global, 'confirm');
      const deleteButton = wrapper.find('[data-test-subj="deleteSynonymSetButton"]');
      expect(deleteButton).toHaveLength(1);

      confirmSpy.mockReturnValueOnce(false);
      deleteButton.simulate('click');
      expect(actions.deleteSynonymSet).not.toHaveBeenCalled();

      confirmSpy.mockReturnValueOnce(true);
      deleteButton.simulate('click');
      expect(actions.deleteSynonymSet).toHaveBeenCalledWith('syn-1234567890');
    });
  });

  it('does not render if the modal is not open', () => {
    setMockValues({ ...values, isModalOpen: false });
    const wrapper = shallow(<SynonymModal />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
