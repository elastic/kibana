/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { TestProviders, mockGetAllCasesSelectorModal } from '../../../../mock';
import { AddToCaseAction } from './add_to_case_action';
import { SECURITY_SOLUTION_OWNER } from '../../../../../../cases/common';
import { AddToCaseActionButton } from './add_to_case_action_button';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    search: '',
  }),
}));
jest.mock('./helpers');

describe('AddToCaseAction', () => {
  const props = {
    event: {
      _id: 'test-id',
      data: [],
      ecs: {
        _id: 'test-id',
        _index: 'test-index',
        signal: { rule: { id: ['rule-id'], name: ['rule-name'], false_positives: [] } },
      },
    },
    casePermissions: {
      crud: true,
      read: true,
    },
    appId: 'securitySolution',
    onClose: () => null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton {...props} />
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).exists()).toBeTruthy();
  });

  it('it opens the context menu', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton {...props} />
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="add-new-case-item"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).exists()).toBeTruthy();
  });

  it('it opens the create case modal', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton {...props} />
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');
    expect(wrapper.find('[data-test-subj="create-case-flyout"]').exists()).toBeTruthy();
  });

  it('it opens the all cases modal', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton {...props} />
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');

    expect(wrapper.find('[data-test-subj="all-cases-modal"]')).toBeTruthy();
  });

  it('it set rule information as null when missing', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton
          {...props}
          event={{
            _id: 'test-id',
            data: [{ field: ALERT_RULE_UUID, value: ['rule-id'] }],
            ecs: {
              _id: 'test-id',
              _index: 'test-index',
              signal: { rule: { id: ['rule-id'], false_positives: [] } },
            },
          }}
        />
        <AddToCaseAction
          {...props}
          event={{
            _id: 'test-id',
            data: [{ field: ALERT_RULE_UUID, value: ['rule-id'] }],
            ecs: {
              _id: 'test-id',
              _index: 'test-index',
              signal: { rule: { id: ['rule-id'], false_positives: [] } },
            },
          }}
        />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');
    expect(mockGetAllCasesSelectorModal.mock.calls[0][0].alertData).toEqual({
      alertId: 'test-id',
      index: 'test-index',
      rule: {
        id: 'rule-id',
        name: null,
      },
      owner: SECURITY_SOLUTION_OWNER,
    });
  });

  it('disabled when event type is not supported', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton
          {...props}
          event={{
            _id: 'test-id',
            data: [],
            ecs: {
              _id: 'test-id',
              _index: 'test-index',
            },
          }}
        />
        <AddToCaseAction
          {...props}
          event={{
            _id: 'test-id',
            data: [],
            ecs: {
              _id: 'test-id',
              _index: 'test-index',
            },
          }}
        />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });

  it('hides the icon when user does not have crud permissions', () => {
    const newProps = {
      ...props,
      casePermissions: {
        crud: false,
        read: true,
      },
    };
    const wrapper = mount(
      <TestProviders>
        <AddToCaseActionButton {...newProps} />
        <AddToCaseAction {...newProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).exists()).toBeFalsy();
  });
});
