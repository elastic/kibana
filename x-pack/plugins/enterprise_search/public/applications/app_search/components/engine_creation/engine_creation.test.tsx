/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';
import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { EngineCreation } from './';

describe('EngineCreation', () => {
  const DEFAULT_VALUES = {
    ingestionMethod: '',
    isLoading: false,
    name: '',
    rawName: '',
    language: 'Universal',
    isSubmitDisabled: false,
  };

  const MOCK_ACTIONS = {
    setIngestionMethod: jest.fn(),
    setRawName: jest.fn(),
    setLanguage: jest.fn(),
    submitEngine: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = shallow(<EngineCreation />);
    expect(wrapper.find('[data-test-subj="EngineCreation"]')).toHaveLength(1);
  });

  it('EngineCreationLanguageInput calls setIngestionMethod on mount', () => {
    const search = '?method=crawler';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));

    shallow(<EngineCreation />);
    expect(MOCK_ACTIONS.setIngestionMethod).toHaveBeenCalledWith('crawler');
  });

  it('EngineCreationForm calls submitEngine on form submit', () => {
    const wrapper = shallow(<EngineCreation />);
    const simulatedEvent = {
      preventDefault: jest.fn(),
    };
    wrapper.find('[data-test-subj="EngineCreationForm"]').simulate('submit', simulatedEvent);

    expect(MOCK_ACTIONS.submitEngine).toHaveBeenCalledTimes(1);
  });

  it('EngineCreationNameInput calls setRawName on change', () => {
    const wrapper = shallow(<EngineCreation />);
    const simulatedEvent = {
      currentTarget: { value: 'new-raw-name' },
    };
    wrapper.find('[data-test-subj="EngineCreationNameInput"]').simulate('change', simulatedEvent);

    expect(MOCK_ACTIONS.setRawName).toHaveBeenCalledWith('new-raw-name');
  });

  it('EngineCreationLanguageInput calls setLanguage on change', () => {
    const wrapper = shallow(<EngineCreation />);
    const simulatedEvent = {
      currentTarget: { value: 'English' },
    };
    wrapper
      .find('[data-test-subj="EngineCreationLanguageInput"]')
      .simulate('change', simulatedEvent);

    expect(MOCK_ACTIONS.setLanguage).toHaveBeenCalledWith('English');
  });

  describe('NewEngineSubmitButton', () => {
    it('is disabled when name is empty', () => {
      setMockValues({ ...DEFAULT_VALUES, name: '', rawName: '', isSubmitDisabled: true });
      const wrapper = shallow(<EngineCreation />);

      expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]').prop('disabled')).toEqual(
        true
      );
    });

    it('is enabled when name has a value', () => {
      setMockValues({ ...DEFAULT_VALUES, name: 'test', rawName: 'test' });
      const wrapper = shallow(<EngineCreation />);

      expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]').prop('disabled')).toEqual(
        false
      );
    });

    it('passes isLoading state', () => {
      setMockValues({ ...DEFAULT_VALUES, isLoading: true });
      const wrapper = shallow(<EngineCreation />);

      expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]').prop('isLoading')).toEqual(
        true
      );
    });
  });

  describe('EngineCreationNameFormRow', () => {
    it('renders sanitized name helptext when the raw name is being sanitized', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        name: 'un-sanitized-name',
        rawName: 'un-----sanitized-------name',
      });
      const wrapper = shallow(<EngineCreation />);
      const formRow = wrapper.find('[data-test-subj="EngineCreationNameFormRow"]').dive();

      expect(formRow.contains('Your engine will be named')).toBeTruthy();
    });

    it('renders allowed character helptext when rawName and sanitizedName match', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        name: 'pre-sanitized-name',
        rawName: 'pre-sanitized-name',
      });
      const wrapper = shallow(<EngineCreation />);
      const formRow = wrapper.find('[data-test-subj="EngineCreationNameFormRow"]').dive();

      expect(
        formRow.contains('Engine names can only contain lowercase letters, numbers, and hyphens')
      ).toBeTruthy();
    });
  });
});
