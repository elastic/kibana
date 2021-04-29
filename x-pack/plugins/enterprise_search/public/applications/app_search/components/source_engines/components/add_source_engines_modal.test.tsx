/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonEmpty, EuiModal } from '@elastic/eui';

import { EngineDetails } from '../../engine/types';

import { AddSourceEnginesModal } from './add_source_engines_modal';

const MOCK_VALUES = {
  // EnginesLogic
  engines: [
    { name: 'source-engine-1' },
    { name: 'source-engine-2' },
    { name: 'source-engine-3' },
  ] as EngineDetails[],
  // SouceEnginesLogic
  selectedEngineNamesToAdd: ['source-engine-2'],
  sourceEngines: [{ name: 'source-engine-1' }] as EngineDetails[],
};

const MOCK_ACTIONS = {
  // SourceEnginesLogic
  closeAddSourceEnginesModal: jest.fn(),
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

  describe('cancel button', () => {
    it('calls closeAddSourceEnginesModal when clicked', () => {
      wrapper.find(EuiButtonEmpty).simulate('click');

      expect(MOCK_ACTIONS.closeAddSourceEnginesModal).toHaveBeenCalled();
    });
  });
});
