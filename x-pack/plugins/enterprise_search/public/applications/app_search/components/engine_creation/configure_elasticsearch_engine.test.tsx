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

import { shallow } from 'enzyme';

import { ConfigureElasticsearchEngine } from './configure_elasticsearch_engine';
import { EngineCreationSteps } from './engine_creation_logic';

describe('ConfigureElasticsearchEngine', () => {
  const DEFAULT_VALUES = {
    aliasName: '',
    aliasRawName: '',
    isSubmitDisabled: false,
    name: '',
    rawName: '',
  };

  const MOCK_ACTIONS = {
    loadIndices: jest.fn(),
    setAliasRawName: jest.fn(),
    setCreationStep: jest.fn(),
    setRawName: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = shallow(<ConfigureElasticsearchEngine />);
    expect(wrapper.find('[data-test-subj="EngineCreationForm"]')).toHaveLength(1);
  });

  it('EngineCreationForm calls setCreationStep on form submit', () => {
    const wrapper = shallow(<ConfigureElasticsearchEngine />);
    const simulatedEvent = {
      preventDefault: jest.fn(),
    };
    wrapper.find('[data-test-subj="EngineCreationForm"]').simulate('submit', simulatedEvent);

    expect(MOCK_ACTIONS.setCreationStep).toHaveBeenCalledWith(EngineCreationSteps.ReviewStep);
  });

  it('NewEngineBackButton calls setCreationStep when clicked', () => {
    const wrapper = shallow(<ConfigureElasticsearchEngine />);
    wrapper.find('[data-test-subj="NewEngineBackButton"]').simulate('click');

    expect(MOCK_ACTIONS.setCreationStep).toHaveBeenCalledWith(EngineCreationSteps.SelectStep);
  });

  it('EngineCreationNameInput calls setRawName on change', () => {
    const wrapper = shallow(<ConfigureElasticsearchEngine />);
    const simulatedEvent = {
      currentTarget: { value: 'new-raw-name' },
    };
    wrapper.find('[data-test-subj="EngineCreationNameInput"]').simulate('change', simulatedEvent);

    expect(MOCK_ACTIONS.setRawName).toHaveBeenCalledWith('new-raw-name');
  });

  describe('NewEngineContinueButton', () => {
    it('is disabled when isSubmitDisabled is true', () => {
      setMockValues({ ...DEFAULT_VALUES, isSubmitDisabled: true });
      const wrapper = shallow(<ConfigureElasticsearchEngine />);
      const submitButton = wrapper.find('[data-test-subj="NewEngineContinueButton"]');

      expect(submitButton.prop('disabled')).toEqual(true);
    });

    it('is enabled isSubmitDisabled is false', () => {
      const wrapper = shallow(<ConfigureElasticsearchEngine />);
      const submitButton = wrapper.find('[data-test-subj="NewEngineContinueButton"]');

      expect(submitButton.prop('disabled')).toEqual(false);
    });
  });

  describe('EngineCreationNameFormRow', () => {
    it('renders sanitized name helptext when the raw name is being sanitized', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        name: 'un-sanitized-name',
        rawName: 'un-----sanitized-------name',
      });
      const wrapper = shallow(<ConfigureElasticsearchEngine />);
      const formRow = wrapper.find('[data-test-subj="EngineCreationNameFormRow"]').dive();

      expect(formRow.contains('Your engine will be named')).toBeTruthy();
    });

    it('renders allowed character helptext when rawName and sanitizedName match', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        name: 'pre-sanitized-name',
        rawName: 'pre-sanitized-name',
      });
      const wrapper = shallow(<ConfigureElasticsearchEngine />);
      const formRow = wrapper.find('[data-test-subj="EngineCreationNameFormRow"]').dive();

      expect(
        formRow.contains('Engine names can only contain lowercase letters, numbers, and hyphens')
      ).toBeTruthy();
    });
  });

  describe('AliasNameFormRow', () => {
    it('renders sanitized aliasName helptext when the aliasRawName is being sanitized', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        aliasName: 'un-sanitized-name',
        aliasRawName: 'un-----sanitized-------name',
      });
      const wrapper = shallow(<ConfigureElasticsearchEngine />);
      const formRow = wrapper.find('[data-test-subj="AliasNameFormRow"]').dive();
      const expectedMessage =
        "Alias names must be prefixed with 'search-' in order to be used with App Search engines. Your alias will be named";

      expect(formRow.contains(expectedMessage)).toBeTruthy();
    });

    it('renders prefix helptext when aliasRawName and aliasName match', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        aliasName: 'pre-sanitized-name',
        aliasRawName: 'pre-sanitized-name',
      });
      const wrapper = shallow(<ConfigureElasticsearchEngine />);
      const formRow = wrapper.find('[data-test-subj="AliasNameFormRow"]').dive();
      const expectedMessage =
        "Alias names must be prefixed with 'search-' in order to be used with App Search engines";

      expect(formRow.contains(expectedMessage)).toBeTruthy();
    });
  });

  it('AliasNameInput calls setAliasRawName on change', () => {
    const wrapper = shallow(<ConfigureElasticsearchEngine />);
    const simulatedEvent = {
      currentTarget: { value: 'search-new-raw-name' },
    };
    wrapper.find('[data-test-subj="AliasNameInput"]').simulate('change', simulatedEvent);

    expect(MOCK_ACTIONS.setAliasRawName).toHaveBeenCalledWith('search-new-raw-name');
  });
});
