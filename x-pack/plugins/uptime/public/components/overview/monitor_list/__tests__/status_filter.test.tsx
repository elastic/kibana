/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  mountWithRouter,
  renderWithRouter,
  shallowWithRouter,
  MountWithReduxProvider,
} from '../../../../lib';
import { createMemoryHistory } from 'history';
import { StatusFilter } from '../status_filter';
import { FilterStatusButton } from '../filter_status_button';

describe('StatusFilterComponent', () => {
  beforeEach(() => {});

  const getStatusBtns = (status: string) => {
    const history = createMemoryHistory({
      initialEntries: [`/?g=%22%22&statusFilter=${status}`],
    });

    const wrapper = mountWithRouter(
      <MountWithReduxProvider>
        <StatusFilter />
      </MountWithReduxProvider>,
      history
    );
    const filterBtns = wrapper.find(FilterStatusButton);

    const allBtn = filterBtns.at(0);
    const upBtn = filterBtns.at(1);
    const downBtn = filterBtns.at(2);

    return { allBtn, upBtn, downBtn, wrapper };
  };

  it('shallow renders without errors for valid props', () => {
    const wrapper = shallowWithRouter(<StatusFilter />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors for valid props', () => {
    const wrapper = renderWithRouter(
      <MountWithReduxProvider>
        <StatusFilter />
      </MountWithReduxProvider>
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('checks if it properly validates url state when filter is up', () => {
    const { allBtn, upBtn, downBtn } = getStatusBtns('up');

    expect(allBtn.props().isActive).toBe(false);
    expect(upBtn.props().isActive).toBe(true);
    expect(downBtn.props().isActive).toBe(false);
  });

  it('checks if it properly validates url state when filter is down', () => {
    const { allBtn, upBtn, downBtn } = getStatusBtns('down');

    expect(allBtn.props().isActive).toBe(false);
    expect(upBtn.props().isActive).toBe(false);
    expect(downBtn.props().isActive).toBe(true);
  });

  it('checks if it properly validates url state when filter is all', () => {
    const { allBtn, upBtn, downBtn } = getStatusBtns('');

    expect(allBtn.props().isActive).toBe(true);
    expect(upBtn.props().isActive).toBe(false);
    expect(downBtn.props().isActive).toBe(false);
  });
});
