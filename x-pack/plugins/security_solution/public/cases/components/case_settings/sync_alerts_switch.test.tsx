/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { SyncAlertsSwitch } from './sync_alerts_switch';

describe('SyncAlertsSwitch', () => {
  it('it renders', async () => {
    const wrapper = mount(<SyncAlertsSwitch disabled={false} />);

    expect(wrapper.find(`[data-test-subj="sync-alerts-switch"]`).exists()).toBeTruthy();
  });

  it('it toggles the switch', async () => {
    const wrapper = mount(<SyncAlertsSwitch disabled={false} />);

    wrapper.find('button[data-test-subj="sync-alerts-switch"]').first().simulate('click');

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="sync-alerts-switch"]').first().prop('checked')).toBe(
        false
      );
    });
  });

  it('it disables the switch', async () => {
    const wrapper = mount(<SyncAlertsSwitch disabled={true} />);

    expect(wrapper.find(`[data-test-subj="sync-alerts-switch"]`).first().prop('disabled')).toBe(
      true
    );
  });

  it('it start as off', async () => {
    const wrapper = mount(<SyncAlertsSwitch disabled={false} isSynced={false} showLabel={true} />);

    expect(wrapper.find(`[data-test-subj="sync-alerts-switch"]`).first().text()).toBe('Off');
  });

  it('it shows the correct labels', async () => {
    const wrapper = mount(<SyncAlertsSwitch disabled={false} showLabel={true} />);

    expect(wrapper.find('[data-test-subj="sync-alerts-switch"]').first().text()).toBe('On');
    wrapper.find('button[data-test-subj="sync-alerts-switch"]').first().simulate('click');

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="sync-alerts-switch"]`).first().text()).toBe('Off');
    });
  });
});
