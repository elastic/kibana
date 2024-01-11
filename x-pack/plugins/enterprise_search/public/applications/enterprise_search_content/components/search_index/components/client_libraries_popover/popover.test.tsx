/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';
import '../../../../../shared/doc_links/__mocks__/doc_links.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';

import { docLinks } from '../../../../../shared/doc_links';

import { ClientLibrariesPopover } from './popover';

const librariesList = [
  {
    href: docLinks.clientsJavaIntroduction,

    text: 'Java',
  },
  {
    href: docLinks.clientsJsIntro,

    text: 'Javascript / Node',
  },
  {
    href: docLinks.clientsRubyOverview,

    text: 'Ruby',
  },
  {
    href: docLinks.clientsGoIndex,

    text: 'Go',
  },
  {
    href: docLinks.clientsNetIntroduction,

    text: '.NET',
  },
  {
    href: docLinks.clientsPhpGuide,
    text: 'PHP',
  },
  {
    href: docLinks.clientsPerlGuide,
    text: 'Perl',
  },
  {
    href: docLinks.clientsPythonOverview,
    text: 'Python',
  },
  {
    href: docLinks.clientsRustOverview,
    text: 'Rust',
  },
];

const mockValues = {
  isClientsPopoverOpen: false,
};

const mockActions = { toggleClientsPopover: jest.fn() };

describe('ClientLibrariesPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all urls correctly', () => {
    setMockValues({
      ...mockValues,
      indices: [],
    });
    setMockActions(mockActions);

    const wrapper = shallow(<ClientLibrariesPopover />);
    const contextMenuItems =
      wrapper
        .find(EuiContextMenuPanel)
        .prop('items')
        ?.map((item: HTMLElement) => shallow(<div>{item}</div>)) || [];

    expect(contextMenuItems.length > 0).toBeTruthy();

    contextMenuItems.forEach((item: ShallowWrapper, index: number) => {
      const menuItem = item.find(EuiContextMenuItem);
      expect(menuItem.prop('href')).toEqual(librariesList[index].href);
    });
  });
});
