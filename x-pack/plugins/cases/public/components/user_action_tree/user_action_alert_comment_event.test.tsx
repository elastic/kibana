/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../common/mock';
import { useKibana } from '../../common/lib/kibana';
import { AlertCommentEvent } from './user_action_alert_comment_event';
import { CommentType } from '../../../common';

const props = {
  alertId: 'alert-id-1',
  getCaseDetailHrefWithCommentId: jest.fn().mockReturnValue('someCaseDetail-withcomment'),
  getRuleDetailsHref: jest.fn().mockReturnValue('some-detection-rule-link'),
  onRuleDetailsClick: jest.fn(),
  ruleId: 'rule-id-1',
  ruleName: 'Awesome rule',
  alertsCount: 1,
  commentType: CommentType.alert,
};

jest.mock('../../common/lib/kibana');
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
