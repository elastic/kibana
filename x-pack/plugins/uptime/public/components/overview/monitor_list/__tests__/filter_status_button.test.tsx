/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactRedux from 'react-redux';
import { FilterStatusButton, FilterStatusButtonProps } from '../filter_status_button';
import { renderWithRouter, shallowWithRouter, MountWithReduxProvider } from '../../../../lib';

describe('FilterStatusButton', () => {
  let props: FilterStatusButtonProps;
  beforeAll(() => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockReturnValue({
      statusFilter: 'up',
    });
  });

  beforeEach(() => {
    props = {
      content: 'Up',
      dataTestSubj: 'foo',
      value: 'up',
      withNext: true,
      isActive: true,
    };
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('shallow renders without errors for valid props', () => {
    const wrapper = shallowWithRouter(<FilterStatusButton {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors for valid props', () => {
    const wrapper = renderWithRouter(
      <MountWithReduxProvider>
        <FilterStatusButton {...props} />
      </MountWithReduxProvider>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
