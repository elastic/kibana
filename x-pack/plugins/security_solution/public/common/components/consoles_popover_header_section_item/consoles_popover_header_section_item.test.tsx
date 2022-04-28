/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../mock/endpoint';
import { ConsolesPopoverHeaderSectionItem } from './consoles_popover_header_section_item';
import { useUserPrivileges as _useUserPrivileges } from '../user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../user_privileges/endpoint/mocks';

jest.mock('../user_privileges');
const userUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('When rendering the `ConsolesPopoverHeaderSectionItem`', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let setExperimentalFlag: AppContextTestRender['setExperimentalFlag'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    setExperimentalFlag = mockedContext.setExperimentalFlag;
    setExperimentalFlag({ responseActionsConsoleEnabled: true });
    render = () => {
      return (renderResult = mockedContext.render(<ConsolesPopoverHeaderSectionItem />));
    };
  });

  afterEach(() => {
    userUserPrivilegesMock.mockReturnValue({
      ...userUserPrivilegesMock(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });
  });

  it('should show menu item if feature flag is true and user has authz to endpoint management', () => {
    render();

    expect(renderResult.getByTestId('endpointConsoles')).toBeTruthy();
  });

  it('should hide the menu item if feature flag is false', () => {
    setExperimentalFlag({ responseActionsConsoleEnabled: false });
    render();

    expect(renderResult.queryByTestId('endpointConsoles')).toBeNull();
  });

  it('should hide menu item if user does not have authz to endpoint management', () => {
    userUserPrivilegesMock.mockReturnValue({
      ...userUserPrivilegesMock(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canAccessEndpointManagement: false,
      }),
    });
    render();

    expect(renderResult.queryByTestId('endpointConsoles')).toBeNull();
  });
});
