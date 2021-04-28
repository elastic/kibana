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

import { shallow } from 'enzyme';

import { EuiCodeBlock } from '@elastic/eui';

import { Loading } from '../../../shared/loading';

import { SourceEngines } from '.';

const MOCK_ACTIONS = {
  // SourceEnginesLogic
  fetchSourceEngines: jest.fn(),
};

const MOCK_VALUES = {
  dataLoading: false,
  sourceEngines: [],
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
  });

  describe('happy-path states', () => {
    it('renders and calls a function to initialize data', () => {
      setMockValues(MOCK_VALUES);
      const wrapper = shallow(<SourceEngines />);

      expect(wrapper.find(EuiCodeBlock)).toHaveLength(1);
      expect(MOCK_ACTIONS.fetchSourceEngines).toHaveBeenCalled();
    });
  });
});
