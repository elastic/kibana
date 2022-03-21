/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import React from 'react';
import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { EuiCard, EuiText } from '@elastic/eui';

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

    expect(wrapper.find(EuiCard)).toHaveLength(2);
    expect(wrapper.find(EuiCardTo)).toHaveLength(1);
  });

  it('renders with disabled buttons', () => {
    const wrapper = shallow(<DocumentCreationButtons disabled />);

    expect(wrapper.find(EuiCard).first().prop('isDisabled')).toEqual(true);
    expect(wrapper.find(EuiCardTo).prop('isDisabled')).toEqual(true);
  });

  it('renders with flyoutHeader', () => {
    const wrapper = shallow(<DocumentCreationButtons isFlyout />);

    expect(wrapper.find(EuiText)).toHaveLength(1);
  });

  it('opens the DocumentCreationFlyout on click', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    wrapper.find(EuiCard).at(0).simulate('click');
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('json');

    wrapper.find(EuiCard).at(1).simulate('click');
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('api');
  });

  it('renders the crawler button with a link to the crawler page', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    expect(wrapper.find(EuiCardTo).prop('to')).toEqual('/engines/some-engine/crawler');
  });

  it('calls openDocumentCreation("json") if ?method=json', () => {
    const search = '?method=json';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));

    shallow(<DocumentCreationButtons />);
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('json');
  });

  it('calls openDocumentCreation("api") if ?method=api', () => {
    const search = '?method=api';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));

    shallow(<DocumentCreationButtons />);
    expect(actions.openDocumentCreation).toHaveBeenCalledWith('api');
  });
});
