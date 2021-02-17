/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { MetaEngineCreation } from './';

const DEFAULT_VALUES = {
  name: '',
  rawName: '',
};

const MOCK_ACTIONS = {
  setRawName: jest.fn(),
};

describe('MetaEngineCreation', () => {
  beforeEach(() => {
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<MetaEngineCreation />);
    expect(wrapper.find('[data-test-subj="MetaEngineCreation"]')).toHaveLength(1);
  });

  it('calls fetchIndexedEngineNames on first render', () => {
    const wrapper = shallow(<MetaEngineCreation />);
    throw Error('TODO');
  });

  describe('MetaEngineCreationNameInput', () => {
    it('uses rawName as its value', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        rawName: 'Name__With#$&*%Special--Characters',
      });

      const wrapper = shallow(<MetaEngineCreation />);
      expect(
        wrapper
          .find('[data-test-subj="MetaEngineCreationNameInput"]')
          .render()
          .find('input') // as far as I can tell I can't include this input in the .find() two lines above
          .attr('value')
      ).toEqual('Name__With#$&*%Special--Characters');
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
});
