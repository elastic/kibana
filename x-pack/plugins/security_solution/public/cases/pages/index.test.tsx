/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { BrowserRouter as Router } from 'react-router-dom';

import { useGetUserCasesPermissions, useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { Case } from '.';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../common/lib/kibana');

const mockedSetBadge = jest.fn();

describe('CaseContainerComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.chrome.setBadge = mockedSetBadge;
  });

  it('does not display the readonly glasses badge when the user has write permissions', () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: true,
      read: false,
    });

    mount(
      <Router>
        <TestProviders>
          <Case />
        </TestProviders>
      </Router>
    );

    expect(mockedSetBadge).not.toBeCalled();
  });

  it('does not display the readonly glasses badge when the user has neither write nor read permissions', () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: false,
      read: false,
    });

    mount(
      <Router>
        <TestProviders>
          <Case />
        </TestProviders>
      </Router>
    );

    expect(mockedSetBadge).not.toBeCalled();
  });

  it('does not display the readonly glasses badge when the user has null permissions', () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue(null);

    mount(
      <Router>
        <TestProviders>
          <Case />
        </TestProviders>
      </Router>
    );

    expect(mockedSetBadge).not.toBeCalled();
  });

  it('displays the readonly glasses badge read permissions but not write', () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: false,
      read: true,
    });

    mount(
      <Router>
        <TestProviders>
          <Case />
        </TestProviders>
      </Router>
    );

    expect(mockedSetBadge).toBeCalledTimes(1);
  });
});
