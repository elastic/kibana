/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab } from '@elastic/eui';
import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { HistoryTabs, HistoryTabsProps, IHistoryTab } from '..';
import * as hooks from '../../../../hooks/useLocation';
import { history } from '../../../../utils/history';

type PropsOf<Component> = Component extends React.SFC<infer Props>
  ? Props
  : never;
type EuiTabProps = PropsOf<typeof EuiTab>;

describe('HistoryTabs', () => {
  let mockLocation: any;
  let testTabs: IHistoryTab[];
  let testProps: HistoryTabsProps;

  beforeEach(() => {
    mockLocation = {
      pathname: ''
    };

    jest.spyOn(hooks, 'useLocation').mockImplementation(() => mockLocation);

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
      tabs: testTabs
    } as HistoryTabsProps;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render correctly', () => {
    mockLocation.pathname = '/two';
    const wrapper = shallow(<HistoryTabs {...testProps} />);
    expect(wrapper).toMatchSnapshot();

    const tabs: ShallowWrapper<EuiTabProps> = wrapper.find(EuiTab);
    expect(tabs.at(0).props().isSelected).toEqual(false);
    expect(tabs.at(1).props().isSelected).toEqual(true);
    expect(tabs.at(2).props().isSelected).toEqual(false);
  });

  it('should push a new state onto history on tab click', () => {
    const pushSpy = jest.spyOn(history, 'push');
    const wrapper = shallow(<HistoryTabs tabs={testTabs} />);

    wrapper
      .find(EuiTab)
      .at(2)
      .simulate('click');

    expect(pushSpy).toHaveBeenCalledWith({ pathname: '/three' });
  });
});
