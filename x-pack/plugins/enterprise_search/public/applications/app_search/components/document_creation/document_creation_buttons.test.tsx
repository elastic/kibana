/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockActions } from '../../../__mocks__/kea.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiCard } from '@elastic/eui';
import { EuiCardTo } from '../../../shared/react_router_helpers';

import { DocumentCreationButtons } from './';

describe('DocumentCreationButtons', () => {
  const actions = {
    openDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    expect(wrapper.find(EuiCard)).toHaveLength(3);
    expect(wrapper.find(EuiCardTo)).toHaveLength(1);
  });

  it('renders with disabled buttons', () => {
    const wrapper = shallow(<DocumentCreationButtons disabled />);

    expect(wrapper.find(EuiCard).first().prop('isDisabled')).toEqual(true);
    expect(wrapper.find(EuiCardTo).prop('isDisabled')).toEqual(true);
  });

  it('opens the DocumentCreationFlyout on click', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    wrapper.find(EuiCard).at(0).simulate('click');
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('text');

    wrapper.find(EuiCard).at(1).simulate('click');
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('file');

    wrapper.find(EuiCard).at(2).simulate('click');
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('api');
  });

  it('renders the crawler button with a link to the crawler page', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    expect(wrapper.find(EuiCardTo).prop('to')).toEqual('/engines/some-engine/crawler');
  });
});
