/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserList } from './user_list';
import * as i18n from '../translations';
import { basicCase } from '../../../containers/mock';
import { useCaseViewNavigation } from '../../../common/navigation/hooks';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import userEvent from '@testing-library/user-event';

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
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useCaseViewNavigationMock.mockReturnValue({ getCaseViewUrl });
    window.open = open;
  });

  it('triggers mailto when email icon clicked', () => {
    const result = appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        users={[
          {
            user: { ...user, full_name: user.fullName },
          },
        ]}
      />
    );

    userEvent.click(result.getByTestId('user-list-email-button'));

    expect(open).toBeCalledWith(
      `mailto:${user.email}?subject=${i18n.EMAIL_SUBJECT(title)}&body=${i18n.EMAIL_BODY(caseLink)}`,
      '_blank'
    );
  });

  it('sort the users correctly', () => {
    const result = appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        users={[
          {
            user: { ...user, full_name: 'Cases' },
          },
          {
            user: { ...user, username: 'elastic', email: 'elastic@elastic.co', full_name: null },
          },
          {
            user: { ...user, username: 'test', full_name: null, email: null },
          },
        ]}
      />
    );

    const userProfiles = result.getAllByTestId('user-profile-username');

    expect(userProfiles[0].textContent).toBe('Cases');
    expect(userProfiles[1].textContent).toBe('elastic@elastic.co');
    expect(userProfiles[2].textContent).toBe('test');
  });
});
