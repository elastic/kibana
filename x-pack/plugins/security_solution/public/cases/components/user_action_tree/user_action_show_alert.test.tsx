/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionShowAlert } from './user_action_show_alert';

const props = {
  id: 'action-id',
  alert: {
    _id: 'alert-id',
    _index: 'alert-index',
    '@timestamp': '2021-01-07T13:58:31.487Z',
    rule: {
      id: 'rule-id',
      name: 'Awesome Rule',
      from: '2021-01-07T13:58:31.487Z',
      to: '2021-01-07T14:58:31.487Z',
    },
  },
};

describe('UserActionShowAlert ', () => {
  let wrapper: ReactWrapper;
  const onShowAlertDetails = jest.fn();

  beforeAll(() => {
    wrapper = mount(<UserActionShowAlert {...props} onShowAlertDetails={onShowAlertDetails} />);
  });

  it('it renders', async () => {
    expect(
      wrapper.find('[data-test-subj="comment-action-show-alert-action-id"]').first().exists()
    ).toBeTruthy();
  });

  it('it calls onClick', async () => {
    wrapper.find('button[data-test-subj="comment-action-show-alert-action-id"]').simulate('click');
    expect(onShowAlertDetails).toHaveBeenCalledWith('alert-id', 'alert-index');
  });
});
