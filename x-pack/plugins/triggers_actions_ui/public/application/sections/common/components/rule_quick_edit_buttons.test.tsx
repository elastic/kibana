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

const updateRulesToBulkEdit = jest.fn();

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
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="bulkEnable"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDisable"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDelete"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkSnooze"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkUnsnooze"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkRemoveSnoozeSchedule"]').exists()).toBeTruthy();
  });

  it('renders enableAll if rules are all disabled', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: false,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="bulkEnable"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDisable"]').exists()).toBeTruthy();
  });

  it('disables the disable/enable/delete bulk actions if in select all mode', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={true}
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="bulkEnable"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkDelete"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkSnooze"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkUnsnooze"]').first().prop('isDisabled')).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').first().prop('isDisabled')
    ).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="bulkRemoveSnoozeSchedule"]').first().prop('isDisabled')
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
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={updateRulesToBulkEdit}
      />
    );

    wrapper.find('[data-test-subj="bulkSnooze"]').first().simulate('click');
    expect(updateRulesToBulkEdit).toHaveBeenCalledTimes(1);
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
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={updateRulesToBulkEdit}
      />
    );

    wrapper.find('[data-test-subj="bulkSnooze"]').first().simulate('click');
    expect(updateRulesToBulkEdit).toHaveBeenCalledTimes(1);
  });
});
