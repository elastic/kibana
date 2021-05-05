/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { DocumentCreationFlyout } from '../../document_creation';

import { DocumentCreationButton } from './document_creation_button';

describe('DocumentCreationButton', () => {
  let wrapper: ShallowWrapper;
  const showCreationModes = jest.fn();

  beforeAll(() => {
    setMockActions({ showCreationModes });
    wrapper = shallow(<DocumentCreationButton />);
  });

  it('renders', () => {
    expect(wrapper.find(EuiButton).length).toEqual(1);
    expect(wrapper.find(DocumentCreationFlyout).length).toEqual(1);
  });

  it('opens the document creation modes modal on click', () => {
    wrapper.find(EuiButton).simulate('click');
    expect(showCreationModes).toHaveBeenCalled();
  });
});
