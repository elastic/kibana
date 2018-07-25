/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';
import { BulkActionControlBar } from './controls';

describe('BulkActionControlBar component', () => {
  let onBulkAction: any;
  let onSearchQueryChange: any;
  let tagOptions;
  let typeOptions;
  let props: any;

  beforeEach(() => {
    onBulkAction = jest.fn();
    onSearchQueryChange = jest.fn();
    tagOptions = [{ value: 'Production' }];
    typeOptions = [{ value: 'Filebeat v6.3.2' }];

    props = {
      onBulkAction,
      onSearchQueryChange,
      tagOptions,
      typeOptions,
    };
  });

  it('matches snapshot', () => {
    const wrapper = shallow(<BulkActionControlBar {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('bulk action button exposes popover', () => {
    const wrapper = mount(<BulkActionControlBar {...props} />);

    wrapper.find('EuiButton').simulate('click');
    // @ts-ignore
    expect(wrapper.instance().state.isPopoverVisible).toBe(true);
  });

  it('bulk action context item clicks trigger action handler', () => {
    const wrapper = mount(<BulkActionControlBar {...props} />);

    wrapper.find('EuiButton').simulate('click');
    wrapper
      .find('EuiContextMenuItem')
      .first()
      .simulate('click');
    expect(onBulkAction).toHaveBeenCalledTimes(1);
    expect(onBulkAction).toBeCalledWith(TABLE_CONFIG.ACTIONS.BULK_EDIT);

    wrapper
      .find('EuiContextMenuItem')
      .at(1)
      .simulate('click');
    expect(onBulkAction).toHaveBeenCalledTimes(2);
    expect(onBulkAction).toBeCalledWith(TABLE_CONFIG.ACTIONS.BULK_DELETE);

    wrapper
      .find('EuiContextMenuItem')
      .last()
      .simulate('click');
    expect(onBulkAction).toHaveBeenCalledTimes(3);
    expect(onBulkAction).toBeCalledWith(TABLE_CONFIG.ACTIONS.BULK_ASSIGN_TAG);
  });
});
