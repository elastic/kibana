/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { UserList } from '.';
import * as i18n from '../case_view/translations';

describe('UserList ', () => {
  const title = 'Case Title';
  const caseLink = 'http://reddit.com';
  const user = { username: 'username', fullName: 'Full Name', email: 'testemail@elastic.co' };
  const open = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    window.open = open;
  });
  it('triggers mailto when email icon clicked', () => {
    const wrapper = shallow(
      <UserList
        email={{
          subject: i18n.EMAIL_SUBJECT(title),
          body: i18n.EMAIL_BODY(caseLink),
        }}
        headline={i18n.REPORTER}
        users={[user]}
      />
    );
    wrapper.find('[data-test-subj="user-list-email-button"]').simulate('click');
    expect(open).toBeCalledWith(
      `mailto:${user.email}?subject=${i18n.EMAIL_SUBJECT(title)}&body=${i18n.EMAIL_BODY(caseLink)}`,
      '_blank'
    );
  });
});
