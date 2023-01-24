/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { MetaEngineCreation } from '.';

const DEFAULT_VALUES = {
  // MetaEngineLogic
  isLoading: false,
  name: 'test-meta-engine',
  rawName: 'test-meta-engine',
  indexedEngineNames: [],
  selectedIndexedEngineNames: ['one'],
  // AppLogic
  configuredLimits: { engine: { maxEnginesPerMetaEngine: 10 } },
};

const MOCK_ACTIONS = {
  setRawName: jest.fn(),
  setSelectedIndexedEngineNames: jest.fn(),
  fetchIndexedEngineNames: jest.fn(),
  submitEngine: jest.fn(),
};

describe('MetaEngineCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders and calls fetchIndexedEngineNames', () => {
    const wrapper = shallow(<MetaEngineCreation />);
    expect(wrapper.find('[data-test-subj="MetaEngineCreation"]')).toHaveLength(1);
    expect(MOCK_ACTIONS.fetchIndexedEngineNames).toHaveBeenCalledTimes(1);
  });

  describe('MetaEngineCreationNameInput', () => {
    it('uses rawName as its value', () => {
      const wrapper = shallow(<MetaEngineCreation />);
      expect(
        wrapper
          .find('[data-test-subj="MetaEngineCreationNameInput"]')
          .render()
          .find('input') // as far as I can tell I can't include this input in the .find() two lines above
          .attr('value')
      ).toEqual('test-meta-engine');
    });

    it('EngineCreationForm calls submitEngine on form submit', () => {
      const wrapper = shallow(<MetaEngineCreation />);
      const simulatedEvent = {
        preventDefault: jest.fn(),
      };
      wrapper.find('[data-test-subj="MetaEngineCreationForm"]').simulate('submit', simulatedEvent);

      expect(MOCK_ACTIONS.submitEngine).toHaveBeenCalledTimes(1);
    });

    it('MetaEngineCreationNameInput calls setRawName on change', () => {
      const wrapper = shallow(<MetaEngineCreation />);
      const simulatedEvent = {
        currentTarget: { value: 'new-raw-name' },
      };
      wrapper
        .find('[data-test-subj="MetaEngineCreationNameInput"]')
        .simulate('change', simulatedEvent);
      expect(MOCK_ACTIONS.setRawName).toHaveBeenCalledWith('new-raw-name');
    });
  });

  describe('EngineCreationNameFormRow', () => {
    it('renders sanitized name helptext when the raw name is being sanitized', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        name: 'name-with-special-characters',
        rawName: 'Name__With#$&*%Special--Characters',
      });

      const wrapper = shallow(<MetaEngineCreation />);
      const formRow = wrapper.find('[data-test-subj="MetaEngineCreationNameFormRow"]').dive();

      expect(formRow.contains('Your meta engine will be named')).toBeTruthy();
    });

    it('renders allowed character helptext when rawName and sanitizedName match', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        name: 'name-without-special-characters',
        rawName: 'name-without-special-characters',
      });

      const wrapper = shallow(<MetaEngineCreation />);
      const formRow = wrapper.find('[data-test-subj="MetaEngineCreationNameFormRow"]').dive();

      expect(
        formRow.contains(
          'Meta engine names can only contain lowercase letters, numbers, and hyphens'
        )
      ).toBeTruthy();
    });
  });

  it('MetaEngineCreationSourceEnginesInput calls calls setSelectedIndexedEngines on change', () => {
    const wrapper = shallow(<MetaEngineCreation />);

    wrapper
      .find('[data-test-subj="MetaEngineCreationSourceEnginesInput"]')
      .simulate('change', [{ label: 'foo', value: 'foo' }]);

    expect(MOCK_ACTIONS.setSelectedIndexedEngineNames).toHaveBeenCalledWith(['foo']);
  });

  it('renders a warning callout when user has selected too many engines', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      ...{
        selectedIndexedEngineNames: ['one', 'two', 'three'],
        configuredLimits: { engine: { maxEnginesPerMetaEngine: 2 } },
      },
    });
    const wrapper = shallow(<MetaEngineCreation />);

    expect(wrapper.find(EuiCallOut).prop('title')).toContain('Meta engines have a limit of');
  });

  describe('NewMetaEngineSubmitButton', () => {
    it('is enabled for a valid submission', () => {
      const wrapper = shallow(<MetaEngineCreation />);
      const submitButton = wrapper.find('[data-test-subj="NewMetaEngineSubmitButton"]');

      expect(submitButton.prop('disabled')).toEqual(false);
    });

    it('is disabled when name is empty', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        ...{
          name: '',
          rawName: '',
        },
      });
      const wrapper = shallow(<MetaEngineCreation />);
      const submitButton = wrapper.find('[data-test-subj="NewMetaEngineSubmitButton"]');

      expect(submitButton.prop('disabled')).toEqual(true);
    });

    it('is disabled when user has selected no engines', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        ...{
          selectedIndexedEngineNames: [],
        },
      });
      const wrapper = shallow(<MetaEngineCreation />);
      const submitButton = wrapper.find('[data-test-subj="NewMetaEngineSubmitButton"]');

      expect(submitButton.prop('disabled')).toEqual(true);
    });

    it('is disabled when user has selected too many engines', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        ...{
          selectedIndexedEngineNames: ['one', 'two', 'three'],
          configuredLimits: { engine: { maxEnginesPerMetaEngine: 2 } },
        },
      });
      const wrapper = shallow(<MetaEngineCreation />);
      const submitButton = wrapper.find('[data-test-subj="NewMetaEngineSubmitButton"]');

      expect(submitButton.prop('disabled')).toEqual(true);
    });

    it('passes isLoading state', () => {
      setMockValues({ ...DEFAULT_VALUES, isLoading: true });
      const wrapper = shallow(<MetaEngineCreation />);
      const submitButton = wrapper.find('[data-test-subj="NewMetaEngineSubmitButton"]');

      expect(submitButton.prop('isLoading')).toEqual(true);
    });
  });
});
