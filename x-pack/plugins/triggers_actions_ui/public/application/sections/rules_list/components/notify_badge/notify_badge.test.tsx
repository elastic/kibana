/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiButton } from '@elastic/eui';
import React from 'react';
import { act } from 'react-dom/test-utils';
import moment from 'moment';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { RulesListNotifyBadge } from './notify_badge';

jest.mock('../../../../../common/lib/kibana');

describe('RulesListNotifyBadge', () => {
  const onRuleChanged = jest.fn();
  const snoozeRule = jest.fn();
  const unsnoozeRule = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders an unsnoozed badge', () => {
    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          isSnoozedUntil: null,
          muteAll: false,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Rule without snooze
    const badge = wrapper.find(EuiButtonIcon);
    expect(badge.first().props().iconType).toEqual('bell');
  });

  it('renders a snoozed badge', () => {
    jest.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());

    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: false,
          isSnoozedUntil: moment('1990-02-01').toDate(),
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    const snoozeBadge = wrapper.find(EuiButton);

    expect(snoozeBadge.first().props().iconType).toEqual('bellSlash');
    expect(snoozeBadge.text()).toEqual('Feb 1');
  });

  it('renders an indefinitely snoozed badge', () => {
    jest.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());

    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: true,
          isSnoozedUntil: moment('1990-02-01').toDate(),
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    const indefiniteSnoozeBadge = wrapper.find(EuiButtonIcon);

    expect(indefiniteSnoozeBadge.first().props().iconType).toEqual('bellSlash');
    expect(indefiniteSnoozeBadge.text()).toEqual('');
  });

  it('should allow the user to snooze rules', async () => {
    jest.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());
    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: false,
          isSnoozedUntil: null,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Open the popover
    wrapper.find(EuiButtonIcon).first().simulate('click');

    // Snooze for 1 hour
    wrapper.find('button[data-test-subj="linkSnooze1h"]').first().simulate('click');
    expect(snoozeRule).toHaveBeenCalledWith({
      duration: 3600000,
      id: null,
      rRule: {
        count: 1,
        dtstart: '1990-01-01T05:00:00.000Z',
        tzid: 'America/New_York',
      },
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(onRuleChanged).toHaveBeenCalled();
  });

  it('should allow the user to unsnooze rules', async () => {
    jest.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());
    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: true,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Open the popover
    wrapper.find(EuiButtonIcon).first().simulate('click');

    // Unsnooze
    wrapper.find('[data-test-subj="ruleSnoozeCancel"] button').simulate('click');

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(unsnoozeRule).toHaveBeenCalled();
  });
});
