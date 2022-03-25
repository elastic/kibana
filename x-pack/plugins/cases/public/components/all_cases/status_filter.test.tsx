/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { StatusAll } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';
import { StatusFilter } from './status_filter';

const stats = {
  [StatusAll]: 0,
  [CaseStatuses.open]: 2,
  [CaseStatuses['in-progress']]: 5,
  [CaseStatuses.closed]: 7,
};

describe('StatusFilter', () => {
  const onStatusChanged = jest.fn();
  const defaultProps = {
    selectedStatus: CaseStatuses.open,
    onStatusChanged,
    stats,
  };

  it('should render', () => {
    const wrapper = mount(<StatusFilter {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="case-status-filter"]').exists()).toBeTruthy();
  });

  it('should call onStatusChanged when changing status to open', async () => {
    const wrapper = mount(<StatusFilter {...defaultProps} />);

    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-open"]').simulate('click');
    await waitFor(() => {
      expect(onStatusChanged).toBeCalledWith('open');
    });
  });

  it('should call onStatusChanged when changing status to in-progress', async () => {
    const wrapper = mount(<StatusFilter {...defaultProps} />);

    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-in-progress"]').simulate('click');
    await waitFor(() => {
      expect(onStatusChanged).toBeCalledWith('in-progress');
    });
  });

  it('should call onStatusChanged when changing status to closed', async () => {
    const wrapper = mount(<StatusFilter {...defaultProps} />);

    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-closed"]').simulate('click');
    await waitFor(() => {
      expect(onStatusChanged).toBeCalledWith('closed');
    });
  });

  it('should not render hidden statuses', () => {
    const wrapper = mount(
      <StatusFilter {...defaultProps} hiddenStatuses={[StatusAll, CaseStatuses.closed]} />
    );

    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');

    expect(wrapper.find(`[data-test-subj="case-status-filter-all"]`).exists()).toBeFalsy();
    expect(wrapper.find('button[data-test-subj="case-status-filter-closed"]').exists()).toBeFalsy();

    expect(wrapper.find('button[data-test-subj="case-status-filter-open"]').exists()).toBeTruthy();

    expect(
      wrapper.find('button[data-test-subj="case-status-filter-in-progress"]').exists()
    ).toBeTruthy();
  });
});
