/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { Loading } from '../../../shared/loading';

import { AddSourceEnginesButton } from './components/add_source_engines_button';
import { AddSourceEnginesModal } from './components/add_source_engines_modal';
import { SourceEnginesTable } from './components/source_engines_table';

import { SourceEngines } from '.';

const MOCK_ACTIONS = {
  // SourceEnginesLogic
  fetchIndexedEngines: jest.fn(),
  fetchSourceEngines: jest.fn(),
  // FlashMessagesLogic
  dismissToastMessage: jest.fn(),
};

const MOCK_VALUES = {
  // AppLogic
  myRole: {
    canManageMetaEngineSourceEngines: true,
  },
  // SourceEnginesLogic
  addSourceEnginesModalOpen: false,
  dataLoading: false,
  indexedEngines: [],
  selectedEngineNamesToAdd: [],
  sourceEngines: [],
};

describe('SourceEngines', () => {
  beforeEach(() => {
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('non-happy-path states', () => {
    it('renders a loading component before data has loaded', () => {
      setMockValues({ ...MOCK_VALUES, dataLoading: true });
      const wrapper = shallow(<SourceEngines />);

      expect(wrapper.find(Loading)).toHaveLength(1);
    });

    it('hides the add source engines button is the user does not have permissions', () => {
      setMockValues({
        ...MOCK_VALUES,
        myRole: {
          canManageMetaEngineSourceEngines: false,
        },
      });
      const wrapper = shallow(<SourceEngines />);

      expect(wrapper.find(AddSourceEnginesButton)).toHaveLength(0);
    });

    it('shows the add source engines modal', () => {
      setMockValues({
        ...MOCK_VALUES,
        addSourceEnginesModalOpen: true,
      });
      const wrapper = shallow(<SourceEngines />);

      expect(wrapper.find(AddSourceEnginesModal)).toHaveLength(1);
    });
  });

  describe('happy-path states', () => {
    it('renders and calls a function to initialize data', () => {
      const wrapper = shallow(<SourceEngines />);

      expect(wrapper.find(SourceEnginesTable)).toHaveLength(1);
      expect(MOCK_ACTIONS.fetchIndexedEngines).toHaveBeenCalled();
      expect(MOCK_ACTIONS.fetchSourceEngines).toHaveBeenCalled();
    });

    // TODO When this test runs it causes an infinite re-render loop
    it.skip('contains a button to add source engines', () => {
      const wrapper = mount(<SourceEngines />);

      expect(wrapper.find(AddSourceEnginesButton)).toHaveLength(1);
    });

    it('hides the add source engines modal by default', () => {
      const wrapper = shallow(<SourceEngines />);

      expect(wrapper.find(AddSourceEnginesModal)).toHaveLength(0);
    });
  });
});
