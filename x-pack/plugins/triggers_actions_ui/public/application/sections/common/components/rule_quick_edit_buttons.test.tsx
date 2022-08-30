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

describe('rule_quick_edit_buttons', () => {
  it('renders buttons', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
      muteAll: false,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToUpdateAPIKey={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="muteAll"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="unmuteAll"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="enableAll"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="disableAll"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="deleteAll"]').exists()).toBeTruthy();
  });

  it('renders muteAll if rules are all muted', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      muteAll: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToUpdateAPIKey={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="muteAll"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="unmuteAll"]').exists()).toBeTruthy();
  });

  it('renders enableAll if rules are all disabled', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: false,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        setRulesToDelete={() => {}}
        setRulesToUpdateAPIKey={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="enableAll"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="disableAll"]').exists()).toBeFalsy();
  });
});
