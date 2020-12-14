/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiCard } from '@elastic/eui';
import { EuiCardTo } from '../../../shared/react_router_helpers';

import { DocumentCreationButtons } from './';

describe('DocumentCreationButtons', () => {
  const openDocumentCreation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ engineName: 'test-engine' });
    setMockActions({ openDocumentCreation });
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

  it('opens the DocumentCreationModal on click', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    wrapper.find(EuiCard).at(0).simulate('click');
    expect(openDocumentCreation).toHaveBeenCalledWith('text');

    wrapper.find(EuiCard).at(1).simulate('click');
    expect(openDocumentCreation).toHaveBeenCalledWith('file');

    wrapper.find(EuiCard).at(2).simulate('click');
    expect(openDocumentCreation).toHaveBeenCalledWith('api');
  });

  it('renders the Crawler button with a link to the crawler page', () => {
    const wrapper = shallow(<DocumentCreationButtons />);

    expect(wrapper.find(EuiCardTo).prop('to')).toEqual('/engines/test-engine/crawler');
  });
});
