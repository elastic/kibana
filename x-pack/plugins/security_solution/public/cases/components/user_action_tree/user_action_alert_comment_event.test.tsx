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
import { AlertCommentEvent } from './user_action_alert_comment_event';
import { CommentType } from '../../../../../case/common/api';
import { RuleEcs } from '../../../../common/ecs/rule';

const props = {
  alertId: 'alert-id-1',
  alert: {
    _id: 'alert-id-1',
    _index: 'alert-index-1',
    '@timestamp': '2021-01-07T13:58:31.487Z',
    signal: {
      rule: ({
        id: ['rule-id-1'],
        name: ['Awesome rule'],
        from: ['2021-01-07T13:58:31.487Z'],
        to: ['2021-01-07T14:58:31.487Z'],
      } as unknown) as RuleEcs,
    },
  },
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

  it('does NOT render the link when the alert is undefined', async () => {
    const wrapper = mount(
      <TestProviders>
        {/* @ts-expect-error */}
        <AlertCommentEvent alert={undefined} commentType={CommentType.alert} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().exists()
    ).toBeFalsy();

    expect(wrapper.text()).toBe('added an alert');
  });

  it('does NOT render the link when the rule is undefined', async () => {
    const alert = {
      _id: 'alert-id-1',
      _index: 'alert-index-1',
    };

    const wrapper = mount(
      <TestProviders>
        {/* @ts-expect-error*/}
        <AlertCommentEvent alert={alert} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().exists()
    ).toBeFalsy();

    expect(wrapper.text()).toBe('added an alert');
  });

  it('navigate to app on link click', async () => {
    const wrapper = mount(
      <TestProviders>
        <AlertCommentEvent {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="alert-rule-link-alert-id-1"]`).first().simulate('click');
    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:detections', {
      path: '/rules/id/rule-id-1',
    });
  });
});
