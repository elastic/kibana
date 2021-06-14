/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { Loading } from '../../../shared/loading';

import { AddSourceEnginesButton, AddSourceEnginesModal, SourceEnginesTable } from './components';

import { SourceEngines } from '.';

describe('SourceEngines', () => {
  const MOCK_ACTIONS = {
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
    isModalOpen: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders and calls a function to initialize data', () => {
    const wrapper = shallow(<SourceEngines />);

    expect(wrapper.find(SourceEnginesTable)).toHaveLength(1);
    expect(MOCK_ACTIONS.fetchIndexedEngines).toHaveBeenCalled();
    expect(MOCK_ACTIONS.fetchSourceEngines).toHaveBeenCalled();
  });

  it('renders the add source engines modal', () => {
    setMockValues({
      ...MOCK_VALUES,
      isModalOpen: true,
    });
    const wrapper = shallow(<SourceEngines />);

    expect(wrapper.find(AddSourceEnginesModal)).toHaveLength(1);
  });

  it('renders a loading component before data has loaded', () => {
    setMockValues({ ...MOCK_VALUES, dataLoading: true });
    const wrapper = shallow(<SourceEngines />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  describe('page actions', () => {
    const getPageHeader = (wrapper: ShallowWrapper) =>
      wrapper.find(EuiPageHeader).dive().children().dive();

    it('contains a button to add source engines', () => {
      const wrapper = shallow(<SourceEngines />);
      expect(getPageHeader(wrapper).find(AddSourceEnginesButton)).toHaveLength(1);
    });

    it('hides the add source engines button if the user does not have permissions', () => {
      setMockValues({
        ...MOCK_VALUES,
        myRole: {
          canManageMetaEngineSourceEngines: false,
        },
      });
      const wrapper = shallow(<SourceEngines />);

      expect(getPageHeader(wrapper).find(AddSourceEnginesButton)).toHaveLength(0);
    });
  });
});
