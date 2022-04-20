/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { MonitorListTabs } from './list_tabs';

describe('<MonitorListTabs />', () => {
  it('calls delete monitor on monitor deletion', () => {
    const onPageStateChange = jest.fn();
    render(
      <MonitorListTabs
        invalidTotal={20}
        onUpdate={jest.fn()}
        onPageStateChange={onPageStateChange}
      />
    );

    expect(screen.getByText('All monitors')).toBeInTheDocument();
    expect(screen.getByText('Invalid monitors')).toBeInTheDocument();

    expect(onPageStateChange).toHaveBeenCalledTimes(1);
    expect(onPageStateChange).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 10,
      sortField: 'name.keyword',
      sortOrder: 'asc',
    });
  });
});
