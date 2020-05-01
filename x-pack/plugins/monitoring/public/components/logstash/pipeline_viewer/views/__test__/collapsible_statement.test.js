/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CollapsibleStatement } from '../collapsible_statement';
import { shallow } from 'enzyme';
import { EuiButtonIcon } from '@elastic/eui';

describe('CollapsibleStatement component', () => {
  let props;
  let collapse;
  let expand;

  beforeEach(() => {
    collapse = jest.fn();
    expand = jest.fn();
    props = {
      collapse,
      expand,
      id: 'statementId',
      isCollapsed: false,
    };
  });

  it('renders child components', () => {
    const child = <div>child element</div>;

    const wrapper = shallow(<CollapsibleStatement {...props}>{child}</CollapsibleStatement>);

    expect(wrapper).toMatchSnapshot();
  });

  it('calls collapse if component is expanded', () => {
    const wrapper = shallow(<CollapsibleStatement {...props} />);

    wrapper.find(EuiButtonIcon).simulate('click');
    expect(collapse).toHaveBeenCalledTimes(1);
    expect(collapse).toHaveBeenCalledWith('statementId');
  });

  it('calls expand if component is collapsed', () => {
    props.isCollapsed = true;
    const wrapper = shallow(<CollapsibleStatement {...props} />);

    wrapper.find(EuiButtonIcon).simulate('click');
    expect(expand).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledWith('statementId');
  });
});
