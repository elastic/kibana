/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { RuleStatusDropdown, ComponentOpts } from './rule_status_dropdown';

const NOW_STRING = '2020-03-01T00:00:00.000Z';
const SNOOZE_UNTIL = new Date('2020-03-04T00:00:00.000Z');

describe('RuleStatusDropdown', () => {
  const enableRule = jest.fn();
  const disableRule = jest.fn();
  const snoozeRule = jest.fn();
  const unsnoozeRule = jest.fn();
  const props: ComponentOpts = {
    disableRule,
    enableRule,
    snoozeRule,
    unsnoozeRule,
    isEditable: true,
    rule: {
      id: '1',
      name: 'test rule',
      tags: ['tag1'],
      enabled: true,
      ruleTypeId: 'test_rule_type',
      schedule: { interval: '5d' },
      actions: [],
      params: { name: 'test rule type name' },
      createdBy: null,
      updatedBy: null,
      apiKeyOwner: null,
      throttle: '1m',
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'active',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      consumer: 'test',
      actionsCount: 0,
      ruleType: 'test_rule_type',
      createdAt: new Date('2020-08-20T19:23:38Z'),
      enabledInLicense: true,
      isEditable: true,
      notifyWhen: null,
      index: 0,
      updatedAt: new Date('2020-08-20T19:23:38Z'),
      snoozeSchedule: [],
    } as ComponentOpts['rule'],
    onRuleChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(global.Date, 'now').mockImplementation(() => new Date(NOW_STRING).valueOf());
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('renders status control', () => {
    const wrapper = mountWithIntl(<RuleStatusDropdown {...props} />);
    expect(wrapper.find('[data-test-subj="statusDropdown"]').first().props().title).toBe('Enabled');
  });

  test('renders status control as disabled when rule is disabled', () => {
    const wrapper = mountWithIntl(
      <RuleStatusDropdown {...{ ...props, rule: { ...props.rule, enabled: false } }} />
    );
    expect(wrapper.find('[data-test-subj="statusDropdown"]').first().props().title).toBe(
      'Disabled'
    );
  });

  test('renders status control as snoozed when rule is snoozed', () => {
    jest.spyOn(global.Date, 'now').mockImplementation(() => new Date(NOW_STRING).valueOf());

    const wrapper = mountWithIntl(
      <RuleStatusDropdown
        {...{ ...props, rule: { ...props.rule, isSnoozedUntil: SNOOZE_UNTIL } }}
      />
    );
    expect(wrapper.find('[data-test-subj="statusDropdown"]').first().props().title).toBe('Snoozed');
    expect(wrapper.find('[data-test-subj="remainingSnoozeTime"]').first().text()).toBe('3 days');
  });

  test('renders status control as snoozed when rule has muteAll set to true', () => {
    jest.spyOn(global.Date, 'now').mockImplementation(() => new Date(NOW_STRING).valueOf());

    const wrapper = mountWithIntl(
      <RuleStatusDropdown {...{ ...props, rule: { ...props.rule, muteAll: true } }} />
    );
    expect(wrapper.find('[data-test-subj="statusDropdown"]').first().props().title).toBe('Snoozed');
    expect(wrapper.find('[data-test-subj="remainingSnoozeTime"]').first().text()).toBe(
      'Indefinitely'
    );
  });

  test('renders status control as disabled when rule is snoozed but also disabled', () => {
    const wrapper = mountWithIntl(
      <RuleStatusDropdown
        {...{ ...props, rule: { ...props.rule, enabled: false, isSnoozedUntil: SNOOZE_UNTIL } }}
      />
    );
    expect(wrapper.find('[data-test-subj="statusDropdown"]').first().props().title).toBe(
      'Disabled'
    );
  });

  test('renders read-only status control when isEditable is false', () => {
    const wrapper = mountWithIntl(
      <RuleStatusDropdown
        {...{
          ...props,
          rule: { ...props.rule },
        }}
        isEditable={false}
      />
    );
    expect(wrapper.find('[data-test-subj="statusDropdownReadonly"]').first().props().children).toBe(
      'Enabled'
    );
  });
});
