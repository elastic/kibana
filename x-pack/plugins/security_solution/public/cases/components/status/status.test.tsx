/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../../../case/common/api';
import { Status } from './status';

describe('Stats', () => {
  const onClick = jest.fn();

  it('it renders', async () => {
    const wrapper = mount(<Status type={CaseStatuses.open} withArrow={false} onClick={onClick} />);

    expect(wrapper.find(`[data-test-subj="status-badge-open"]`).exists()).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="status-badge-open"] .euiBadge__iconButton`).exists()
    ).toBeFalsy();
  });

  it('it renders with arrow', async () => {
    const wrapper = mount(<Status type={CaseStatuses.open} withArrow={true} onClick={onClick} />);

    expect(
      wrapper.find(`[data-test-subj="status-badge-open"] .euiBadge__iconButton`).exists()
    ).toBeTruthy();
  });

  it('it calls onClick when pressing the badge', async () => {
    const wrapper = mount(<Status type={CaseStatuses.open} withArrow={true} onClick={onClick} />);

    wrapper.find(`[data-test-subj="status-badge-open"] .euiBadge__iconButton`).simulate('click');
    expect(onClick).toHaveBeenCalled();
  });

  describe('Colors', () => {
    it('shows the correct color when status is open', async () => {
      const wrapper = mount(
        <Status type={CaseStatuses.open} withArrow={false} onClick={onClick} />
      );

      expect(wrapper.find(`[data-test-subj="status-badge-open"]`).first().prop('color')).toBe(
        'primary'
      );
    });

    it('shows the correct color when status is in-progress', async () => {
      const wrapper = mount(
        <Status type={CaseStatuses['in-progress']} withArrow={false} onClick={onClick} />
      );

      expect(
        wrapper.find(`[data-test-subj="status-badge-in-progress"]`).first().prop('color')
      ).toBe('warning');
    });

    it('shows the correct color when status is closed', async () => {
      const wrapper = mount(
        <Status type={CaseStatuses.closed} withArrow={false} onClick={onClick} />
      );

      expect(wrapper.find(`[data-test-subj="status-badge-closed"]`).first().prop('color')).toBe(
        'default'
      );
    });
  });
});
