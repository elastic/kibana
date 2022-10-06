/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiButton } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import moment from 'moment';

import { RuleTableItem } from '../../../../types';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { RulesListNotifyBadge } from './rules_list_notify_badge';

jest.mock('../../../../common/lib/kibana');

const onClick = jest.fn();
const onClose = jest.fn();
const onLoading = jest.fn();
const onRuleChanged = jest.fn();
const snoozeRule = jest.fn();
const unsnoozeRule = jest.fn();

const getRule = (overrides = {}): RuleTableItem => ({
  id: '1',
  enabled: true,
  name: 'test rule',
  tags: ['tag1'],
  ruleTypeId: 'test_rule_type',
  consumer: 'rules',
  schedule: { interval: '5d' },
  actions: [
    { id: 'test', actionTypeId: 'the_connector', group: 'rule', params: { message: 'test' } },
  ],
  params: { name: 'test rule type name' },
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  apiKeyOwner: null,
  throttle: '1m',
  notifyWhen: 'onActiveAlert',
  muteAll: false,
  mutedInstanceIds: [],
  executionStatus: {
    status: 'active',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  actionsCount: 1,
  index: 0,
  ruleType: 'Test Rule Type',
  isEditable: true,
  enabledInLicense: true,
  ...overrides,
});

describe('RulesListNotifyBadge', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the notify badge correctly', async () => {
    jest.useFakeTimers('modern').setSystemTime(moment('1990-01-01').toDate());

    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        rule={getRule({
          isSnoozedUntil: null,
          muteAll: false,
        })}
        isLoading={false}
        isOpen={false}
        onLoading={onLoading}
        onClick={onClick}
        onClose={onClose}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Rule without snooze
    const badge = wrapper.find(EuiButtonIcon);
    expect(badge.first().props().iconType).toEqual('bell');

    // Rule with snooze
    wrapper.setProps({
      rule: getRule({
        isSnoozedUntil: moment('1990-02-01').format(),
      }),
    });
    const snoozeBadge = wrapper.find(EuiButton);
    expect(snoozeBadge.first().props().iconType).toEqual('bellSlash');
    expect(snoozeBadge.text()).toEqual('Feb 1');

    // Rule with indefinite snooze
    wrapper.setProps({
      rule: getRule({
        isSnoozedUntil: moment('1990-02-01').format(),
        muteAll: true,
      }),
    });

    const indefiniteSnoozeBadge = wrapper.find(EuiButtonIcon);
    expect(indefiniteSnoozeBadge.first().props().iconType).toEqual('bellSlash');
    expect(indefiniteSnoozeBadge.text()).toEqual('');
  });

  it('should allow the user to snooze rules', async () => {
    jest.useFakeTimers('modern').setSystemTime(moment('1990-01-01').toDate());
    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        rule={getRule({
          isSnoozedUntil: null,
          muteAll: false,
        })}
        isLoading={false}
        isOpen={true}
        onLoading={onLoading}
        onClick={onClick}
        onClose={onClose}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Snooze for 1 hour
    wrapper.find('button[data-test-subj="linkSnooze1h"]').first().simulate('click');
    expect(onLoading).toHaveBeenCalledWith(true);
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
    expect(onLoading).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('should allow the user to unsnooze rules', async () => {
    jest.useFakeTimers('modern').setSystemTime(moment('1990-01-01').toDate());
    const wrapper = mountWithIntl(
      <RulesListNotifyBadge
        rule={getRule({
          muteAll: true,
        })}
        isLoading={false}
        isOpen={true}
        onLoading={onLoading}
        onClick={onClick}
        onClose={onClose}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Unsnooze
    wrapper.find('[data-test-subj="ruleSnoozeCancel"] button').simulate('click');
    expect(onLoading).toHaveBeenCalledWith(true);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(unsnoozeRule).toHaveBeenCalled();
    expect(onLoading).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('should correctly show recurring schedules relative to the current time', async () => {
    jest.useFakeTimers('modern').setSystemTime(moment('1990-01-01T05:00:00.000Z').toDate());
    const ONE_HOUR = 60 * 60 * 1000;

    // Create a rule with a snooze schedule that
    // starts on a tuesday, repeats weekly on thursday for 1 hr, for 5 weeks
    const getWrapper = () => {
      return mountWithIntl(
        <RulesListNotifyBadge
          rule={getRule({
            snoozeSchedule: [
              {
                duration: ONE_HOUR,
                id: '123',
                rRule: {
                  byweekday: ['WE'],
                  freq: 2,
                  count: 5,
                  dtstart: '1990-01-02T05:00:00.000Z',
                  tzid: 'America/New_York',
                },
              },
            ],
          })}
          isLoading={false}
          isOpen={true}
          onLoading={onLoading}
          onClick={onClick}
          onClose={onClose}
          onRuleChanged={onRuleChanged}
          snoozeRule={snoozeRule}
          unsnoozeRule={unsnoozeRule}
        />
      );
    };

    const getButtonText = (wrapper: ReactWrapper) => {
      return wrapper.find('[data-test-subj="rulesListNotifyBadge-scheduled"]').first().text();
    };

    // On monday, before the dtstart date, should show dtstart
    let wrapper = getWrapper();
    expect(getButtonText(wrapper)).toEqual('Jan 2');

    // Advance timer by 1 day
    jest.advanceTimersByTime(1 * 24 * ONE_HOUR);

    // On tuesday, rule should be snoozed for 1 hr. Should show current occurrence inclusive
    wrapper = getWrapper();
    expect(getButtonText(wrapper)).toEqual('Jan 2');

    // Advance timer by 1 day
    jest.advanceTimersByTime(1 * 24 * ONE_HOUR);

    // On wednesday, first occurrence over, show next occurrence.
    wrapper = getWrapper();
    expect(getButtonText(wrapper)).toEqual('Jan 9');

    // Advance timer by 1 day
    jest.advanceTimersByTime(1 * 24 * ONE_HOUR);

    // On thursday, first occurrence over, show next occurrence.
    wrapper = getWrapper();
    expect(getButtonText(wrapper)).toEqual('Jan 9');

    // Advance timer by 60 days
    jest.advanceTimersByTime(60 * 24 * ONE_HOUR);

    // All occurrences over, show last occurrence.
    wrapper = getWrapper();
    expect(getButtonText(wrapper)).toEqual('Jan 30');

    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
});
