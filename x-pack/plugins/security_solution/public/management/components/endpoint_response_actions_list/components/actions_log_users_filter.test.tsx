/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../common/mock/endpoint';
import { ActionsLogUsersFilter } from './actions_log_users_filter';
import { MANAGEMENT_PATH } from '../../../../../common/constants';

describe('Users filter', () => {
  let render: (
    props?: React.ComponentProps<typeof ActionsLogUsersFilter>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  const testPrefix = 'response-actions-list-users-filter';
  let onChangeUsersFilter: jest.Mock;

  beforeEach(async () => {
    onChangeUsersFilter = jest.fn();
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = (props?: React.ComponentProps<typeof ActionsLogUsersFilter>) =>
      (renderResult = mockedContext.render(
        <ActionsLogUsersFilter {...{ isFlyout: false, onChangeUsersFilter }} />
      ));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/response_actions`);
    });
  });

  it('should show a search input for users', () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-search`);
    expect(searchInput).toBeTruthy();
    expect(searchInput.getAttribute('placeholder')).toEqual('Filter by username');
  });

  it('should search on given search string on enter', () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-search`);
    userEvent.type(searchInput, 'usernameX');
    userEvent.type(searchInput, '{enter}');
    expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX']);
  });

  it('should search comma separated strings as multiple users', () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-search`);
    userEvent.type(searchInput, 'usernameX,usernameY,usernameZ');
    userEvent.type(searchInput, '{enter}');
    expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX', 'usernameY', 'usernameZ']);
  });

  it('should ignore white spaces in a given username when updating the API params', () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-search`);
    userEvent.type(searchInput, '   usernameX   ');
    userEvent.type(searchInput, '{enter}');
    expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX']);
  });

  it('should ignore white spaces in comma separated usernames when updating the API params', () => {
    render();

    const searchInput = renderResult.getByTestId(`${testPrefix}-search`);
    userEvent.type(searchInput, '   , usernameX ,usernameY    ,       ');
    userEvent.type(searchInput, '{enter}');
    expect(onChangeUsersFilter).toHaveBeenCalledWith(['usernameX', 'usernameY']);
  });
});
