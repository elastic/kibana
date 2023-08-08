/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { CaseStatuses } from '../../../common/types/domain';
import { StatusPopoverButton } from './status_popover_button';

describe('StatusPopoverButton', () => {
  const onClick = jest.fn();

  it('renders', async () => {
    const wrapper = mount(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

    expect(
      wrapper.find(`[data-test-subj="case-status-badge-popover-button-open"]`).exists()
    ).toBeTruthy();
    expect(
      wrapper
        .find(`[data-test-subj="case-status-badge-popover-button-open"] .euiBadge__iconButton`)
        .exists()
    ).toBeTruthy();
  });

  it('renders with the pop over enabled by default', async () => {
    const wrapper = mount(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

    expect(
      wrapper
        .find(`[data-test-subj="case-status-badge-popover-button-open"] .euiBadge__iconButton`)
        .first()
        .prop('disabled')
    ).toBe(false);
  });

  it('disables the button correctly', async () => {
    const wrapper = mount(
      <StatusPopoverButton disabled={true} status={CaseStatuses.open} onClick={onClick} />
    );

    expect(
      wrapper
        .find(`[data-test-subj="case-status-badge-popover-button-open"] .euiBadge__iconButton`)
        .first()
        .prop('disabled')
    ).toBe(true);
  });

  it('calls onClick when pressing the badge', async () => {
    const wrapper = mount(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

    wrapper
      .find(`[data-test-subj="case-status-badge-popover-button-open"] .euiBadge__iconButton`)
      .first()
      .simulate('click');
    expect(onClick).toHaveBeenCalled();
  });

  describe('Colors', () => {
    it('shows the correct color when status is open', async () => {
      const wrapper = mount(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

      expect(
        wrapper
          .find(`[data-test-subj="case-status-badge-popover-button-open"]`)
          .first()
          .prop('color')
      ).toBe('primary');
    });

    it('shows the correct color when status is in-progress', async () => {
      const wrapper = mount(
        <StatusPopoverButton status={CaseStatuses['in-progress']} onClick={onClick} />
      );

      expect(
        wrapper
          .find(`[data-test-subj="case-status-badge-popover-button-in-progress"]`)
          .first()
          .prop('color')
      ).toBe('warning');
    });

    it('shows the correct color when status is closed', async () => {
      const wrapper = mount(<StatusPopoverButton status={CaseStatuses.closed} onClick={onClick} />);

      expect(
        wrapper
          .find(`[data-test-subj="case-status-badge-popover-button-closed"]`)
          .first()
          .prop('color')
      ).toBe('default');
    });
  });
});
