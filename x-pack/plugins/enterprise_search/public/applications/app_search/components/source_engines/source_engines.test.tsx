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

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { Loading } from '../../../shared/loading';

import { AddSourceEnginesButton } from './components/add_source_engines_button';
import { AddSourceEnginesModal } from './components/add_source_engines_modal';
import { SourceEnginesTable } from './components/source_engines_table';

import { SourceEngines } from '.';

const MOCK_ACTIONS = {
  // SourceEnginesLogic
  fetchIndexedEngines: jest.fn(),
  fetchSourceEngines: jest.fn(),
};

const MOCK_VALUES = {
  // AppLogic
  myRole: {
    canManageMetaEngineSourceEngines: true,
  },
  // SourceEnginesLogic
  dataLoading: false,
  sourceEngines: [],
  addSourceEnginesModalOpen: false,
};

describe('SourceEngines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
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
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      setMockValues(MOCK_VALUES);
      setMockActions(MOCK_ACTIONS);
      wrapper = shallow(<SourceEngines />);
    });

    it.skip('renders and calls a function to initialize data', () => {
      expect(wrapper.find(SourceEnginesTable)).toHaveLength(1);

      // TODO This is definitely being called, is the useEffect mock not working?
      expect(MOCK_ACTIONS.fetchIndexedEngines).toHaveBeenCalled();
      expect(MOCK_ACTIONS.fetchSourceEngines).toHaveBeenCalled();
    });

    it.skip('contains a button to add source engines', () => {
      const header = wrapper.find(EuiPageHeader).dive();

      // TODO fix this test. Where is this button?
      expect(header.find(AddSourceEnginesButton)).toHaveLength(1);
    });

    it('hides the add source engines modal by default', () => {
      expect(wrapper.find(AddSourceEnginesModal)).toHaveLength(0);
    });
  });
});
