/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import { NEW_INDEX_PATH } from '../../../routes';

import { EmptyIndex } from './empty_index';

describe('Empty state', () => {
  it('renders the empty state component', () => {
    const wrapper = mount(<EmptyIndex />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('clicking in navigates to new index page', () => {
    const { navigateToUrl } = mockKibanaValues;

    const wrapper = mount(<EmptyIndex />);
    // @ts-ignore
    wrapper.find(EuiButton).props().onClick();

    expect(navigateToUrl).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledWith(NEW_INDEX_PATH);
  });
});
