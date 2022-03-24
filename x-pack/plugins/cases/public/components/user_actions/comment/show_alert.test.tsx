/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionShowAlert } from './show_alert';

const props = {
  id: 'action-id',
  alertId: 'alert-id',
  index: 'alert-index',
  onShowAlertDetails: jest.fn(),
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
