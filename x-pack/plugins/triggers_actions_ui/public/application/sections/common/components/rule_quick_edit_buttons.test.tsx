/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { RuleTableItem } from '../../../../types';
import { RuleQuickEditButtonsWithApi as RuleQuickEditButtons } from './rule_quick_edit_buttons';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      notifications: { toast: { addDanger: jest.fn() } },
    },
  }),
}));

const setRulesToUpdateAPIKey = jest.fn();
const setRulesToSnooze = jest.fn();
const setRulesToSchedule = jest.fn();
const setRulesToSnoozeFilter = jest.fn();
const setRulesToScheduleFilter = jest.fn();
const setRulesToUpdateAPIKeyFilter = jest.fn();

describe('rule_quick_edit_buttons', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders buttons', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => ''}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToUpdateAPIKey={() => {}}
        setRulesToSnooze={() => {}}
        setRulesToSchedule={() => {}}
        setRulesToSnoozeFilter={() => {}}
        setRulesToScheduleFilter={() => {}}
        setRulesToUpdateAPIKeyFilter={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="enableAll"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="disableAll"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="deleteAll"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkSnooze"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').exists()).toBeTruthy();
  });

  it('renders enableAll if rules are all disabled', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: false,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => ''}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToUpdateAPIKey={() => {}}
        setRulesToSnooze={() => {}}
        setRulesToSchedule={() => {}}
        setRulesToSnoozeFilter={() => {}}
        setRulesToScheduleFilter={() => {}}
        setRulesToUpdateAPIKeyFilter={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="enableAll"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="disableAll"]').exists()).toBeFalsy();
  });

  it('disables the disable/enable/delete bulk actions if in select all mode', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={true}
        getFilter={() => ''}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToUpdateAPIKey={() => {}}
        setRulesToSnooze={() => {}}
        setRulesToSchedule={() => {}}
        setRulesToSnoozeFilter={() => {}}
        setRulesToScheduleFilter={() => {}}
        setRulesToUpdateAPIKeyFilter={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="disableAll"]').first().prop('isDisabled')).toBeTruthy();
    expect(wrapper.find('[data-test-subj="deleteAll"]').first().prop('isDisabled')).toBeTruthy();

    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').first().prop('isDiabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkSnooze"]').first().prop('isDiabled')).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').first().prop('isDiabled')
    ).toBeFalsy();
  });

  it('properly sets rules or filters to delete when not selecting all', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
      enabledInLicense: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => ''}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToSnooze={setRulesToSnooze}
        setRulesToSchedule={setRulesToSchedule}
        setRulesToUpdateAPIKey={setRulesToUpdateAPIKey}
        setRulesToSnoozeFilter={setRulesToSnoozeFilter}
        setRulesToScheduleFilter={setRulesToScheduleFilter}
        setRulesToUpdateAPIKeyFilter={setRulesToUpdateAPIKeyFilter}
      />
    );

    wrapper.find('[data-test-subj="bulkSnooze"]').first().simulate('click');
    expect(setRulesToSnooze).toHaveBeenCalledTimes(1);

    wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').first().simulate('click');
    expect(setRulesToSchedule).toHaveBeenCalledTimes(1);

    wrapper.find('[data-test-subj="updateAPIKeys"]').first().simulate('click');
    expect(setRulesToUpdateAPIKey).toHaveBeenCalledTimes(1);

    expect(setRulesToSnoozeFilter).not.toHaveBeenCalled();
    expect(setRulesToScheduleFilter).not.toHaveBeenCalled();
    expect(setRulesToUpdateAPIKeyFilter).not.toHaveBeenCalled();
  });

  it('properly sets rules or filters to delete when selecting all', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
      enabledInLicense: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={true}
        getFilter={() => ''}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToSnooze={setRulesToSnooze}
        setRulesToSchedule={setRulesToSchedule}
        setRulesToUpdateAPIKey={setRulesToUpdateAPIKey}
        setRulesToSnoozeFilter={setRulesToSnoozeFilter}
        setRulesToScheduleFilter={setRulesToScheduleFilter}
        setRulesToUpdateAPIKeyFilter={setRulesToUpdateAPIKeyFilter}
      />
    );

    wrapper.find('[data-test-subj="bulkSnooze"]').first().simulate('click');
    expect(setRulesToSnoozeFilter).toHaveBeenCalledTimes(1);

    wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').first().simulate('click');
    expect(setRulesToScheduleFilter).toHaveBeenCalledTimes(1);

    wrapper.find('[data-test-subj="updateAPIKeys"]').first().simulate('click');
    expect(setRulesToUpdateAPIKeyFilter).toHaveBeenCalledTimes(1);

    expect(setRulesToSchedule).not.toHaveBeenCalled();
    expect(setRulesToSnooze).not.toHaveBeenCalled();
    expect(setRulesToUpdateAPIKey).not.toHaveBeenCalled();
  });
});
