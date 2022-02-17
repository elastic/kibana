/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { AlertCommentEvent } from './alert_event';
import { CommentType } from '../../../../common/api';

const props = {
  alertId: 'alert-id-1',
  getRuleDetailsHref: jest.fn().mockReturnValue('https://example.com'),
  onRuleDetailsClick: jest.fn(),
  ruleId: 'rule-id-1',
  ruleName: 'Awesome rule',
  alertsCount: 1,
  commentType: CommentType.alert,
};

jest.mock('../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('UserActionAvatar ', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('it renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <AlertCommentEvent {...props} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().exists()
    ).toBeTruthy();
    expect(wrapper.text()).toBe('added an alert from Awesome rule');
  });

  it('does NOT render the link when the rule is null', async () => {
    const wrapper = mount(
      <TestProviders>
        <AlertCommentEvent {...props} ruleId={null} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().exists()
    ).toBeFalsy();

    expect(wrapper.text()).toBe('added an alert from Awesome rule');
  });

  it('does NOT render the link when the href is invalid but it shows the rule name', async () => {
    const wrapper = mount(
      <TestProviders>
        <AlertCommentEvent {...props} getRuleDetailsHref={undefined} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().exists()
    ).toBeFalsy();

    expect(wrapper.text()).toBe('added an alert from Awesome rule');
  });

  it('show Unknown rule if the rule name is invalid', async () => {
    const wrapper = mount(
      <TestProviders>
        <AlertCommentEvent {...props} ruleName={null} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().exists()
    ).toBeTruthy();
    expect(wrapper.text()).toBe('added an alert from Unknown rule');
  });

  it('navigate to app on link click', async () => {
    const onRuleDetailsClick = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <AlertCommentEvent {...props} onRuleDetailsClick={onRuleDetailsClick} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().simulate('click');
    expect(onRuleDetailsClick).toHaveBeenCalled();
  });
});
