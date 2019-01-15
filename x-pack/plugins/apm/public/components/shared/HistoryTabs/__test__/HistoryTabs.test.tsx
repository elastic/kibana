/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab } from '@elastic/eui';
import { mount, ReactWrapper, shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  HistoryTabs,
  HistoryTabsProps,
  HistoryTabsWithoutRouter,
  IHistoryTab
} from '..';

type PropsOf<Component> = Component extends React.SFC<infer Props>
  ? Props
  : never;
type EuiTabProps = PropsOf<typeof EuiTab>;

describe('HistoryTabs', () => {
  let mockLocation: any;
  let mockHistory: any;
  let testTabs: IHistoryTab[];
  let testProps: HistoryTabsProps;

  beforeEach(() => {
    mockLocation = {
      pathname: ''
    };
    mockHistory = {
      push: jest.fn()
    };

    const Content = (props: { name: string }) => <div>{props.name}</div>;

    testTabs = [
      {
        name: 'One',
        path: '/one',
        render: props => <Content {...props} name="one" />
      },
      {
        name: 'Two',
        path: '/two',
        render: () => <Content name="two" />
      },
      {
        name: 'Three',
        path: '/three',
        render: () => <Content name="three" />
      }
    ];

    testProps = {
      location: mockLocation,
      history: mockHistory,
      tabs: testTabs
    } as HistoryTabsProps;
  });

  it('should render correctly', () => {
    mockLocation.pathname = '/two';
    const wrapper = shallow(<HistoryTabsWithoutRouter {...testProps} />);
    expect(wrapper).toMatchSnapshot();

    const tabs: ShallowWrapper<EuiTabProps> = wrapper.find(EuiTab);
    expect(tabs.at(0).props().isSelected).toEqual(false);
    expect(tabs.at(1).props().isSelected).toEqual(true);
    expect(tabs.at(2).props().isSelected).toEqual(false);
  });

  it('should change the selected item on tab click', () => {
    const wrapper = mount(
      <MemoryRouter initialEntries={['/two']}>
        <HistoryTabs tabs={testTabs} />
      </MemoryRouter>
    );

    expect(wrapper.find('Content')).toMatchSnapshot();

    wrapper
      .find(EuiTab)
      .at(2)
      .simulate('click');

    const tabs: ReactWrapper<EuiTabProps> = wrapper.find(EuiTab);
    expect(tabs.at(0).props().isSelected).toEqual(false);
    expect(tabs.at(1).props().isSelected).toEqual(false);
    expect(tabs.at(2).props().isSelected).toEqual(true);

    expect(wrapper.find('Content')).toMatchSnapshot();
  });
});
