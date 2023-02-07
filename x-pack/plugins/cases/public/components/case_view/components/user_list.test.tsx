/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { UserList } from './user_list';
import * as i18n from '../translations';
import { basicCase } from '../../../containers/mock';
import { useCaseViewNavigation } from '../../../common/navigation/hooks';

jest.mock('../../../common/navigation/hooks');

const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('UserList ', () => {
  const title = basicCase.title;
  const caseLink = 'https://example.com/cases/test';
  const user = {
    email: 'case_all@elastic.co',
    fullName: 'Cases',
    username: 'cases_all',
  };

  const open = jest.fn();
  const getCaseViewUrl = jest.fn().mockReturnValue(caseLink);

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({ getCaseViewUrl });
    window.open = open;
  });

  it('triggers mailto when email icon clicked', () => {
    const wrapper = shallow(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        users={[
          {
            user,
          },
        ]}
      />
    );

    wrapper.find('[data-test-subj="user-list-email-button"]').simulate('click');

    expect(open).toBeCalledWith(
      `mailto:${user.email}?subject=${i18n.EMAIL_SUBJECT(title)}&body=${i18n.EMAIL_BODY(caseLink)}`,
      '_blank'
    );
  });
});
