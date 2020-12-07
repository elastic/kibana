/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiButton } from '@elastic/eui';

import { DocumentCreationButton } from './document_creation_button';

describe('DocumentCreationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const wrapper = shallow(<DocumentCreationButton />);
    expect(wrapper.find(EuiButton).length).toEqual(1);
  });
});
