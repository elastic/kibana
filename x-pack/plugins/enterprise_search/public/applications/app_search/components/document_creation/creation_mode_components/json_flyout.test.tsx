/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter, EuiTabs, EuiTab } from '@elastic/eui';

import {
  JsonFlyout,
  PasteJsonTextTabContent,
  UploadJsonFileTabContent,
  PasteJsonTextFooterContent,
  UploadJsonFileFooterContent,
} from './';

describe('JsonFlyout', () => {
  const values = {
    activeJsonTab: 'uploadTab',
  };
  const actions = {
    closeDocumentCreation: jest.fn(),
    setActiveJsonTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a flyout components', () => {
    const wrapper = shallow(<JsonFlyout />);

    expect(wrapper.find(EuiFlyoutHeader)).toHaveLength(1);
    expect(wrapper.find(EuiFlyoutBody)).toHaveLength(1);
    expect(wrapper.find(EuiFlyoutFooter)).toHaveLength(1);
  });

  it('renders Upload json components and calls method with correct param', () => {
    const wrapper = shallow(<JsonFlyout />);
    const tabs = wrapper.find(EuiTabs).find(EuiTab);

    expect(tabs).toHaveLength(2);

    tabs.at(1).simulate('click');

    expect(actions.setActiveJsonTab).toHaveBeenCalledWith('pasteTab');
    expect(wrapper.find(UploadJsonFileTabContent)).toHaveLength(1);
    expect(wrapper.find(UploadJsonFileFooterContent)).toHaveLength(1);
  });

  it('renders Paste json components and calls method with correct param', () => {
    setMockValues({ ...values, activeJsonTab: 'pasteTab' });
    const wrapper = shallow(<JsonFlyout />);
    const tabs = wrapper.find(EuiTabs).find(EuiTab);

    expect(tabs).toHaveLength(2);

    tabs.at(0).simulate('click');

    expect(actions.setActiveJsonTab).toHaveBeenCalledWith('uploadTab');
    expect(wrapper.find(PasteJsonTextTabContent)).toHaveLength(1);
    expect(wrapper.find(PasteJsonTextFooterContent)).toHaveLength(1);
  });
});
