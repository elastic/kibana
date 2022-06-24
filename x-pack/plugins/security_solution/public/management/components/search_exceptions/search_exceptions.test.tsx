/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { useUserPrivileges } from '../../../common/components/user_privileges';

import { SearchExceptions, SearchExceptionsProps } from '.';
import { getEndpointPrivilegesInitialStateMock } from '../../../common/components/user_privileges/endpoint/mocks';
import {
  initialUserPrivilegesState,
  UserPrivilegesState,
} from '../../../common/components/user_privileges/user_privileges_context';
import { EndpointPrivileges } from '../../../../common/endpoint/types';

jest.mock('../../../common/components/user_privileges');

let onSearchMock: jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

describe('Search exceptions', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<SearchExceptionsProps>
  ) => ReturnType<AppContextTestRender['render']>;

  const loadedUserPrivilegesState = (
    endpointOverrides: Partial<EndpointPrivileges> = {}
  ): UserPrivilegesState => {
    return {
      ...initialUserPrivilegesState(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        ...endpointOverrides,
      }),
    };
  };

  beforeEach(() => {
    onSearchMock = jest.fn();
    appTestContext = createAppRootMockRenderer();

    render = (overrideProps = {}) => {
      const props: SearchExceptionsProps = {
        placeholder: 'search test',
        onSearch: onSearchMock,
        ...overrideProps,
      };

      renderResult = appTestContext.render(<SearchExceptions {...props} />);
      return renderResult;
    };

    mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState());
  });

  afterAll(() => {
    mockUseUserPrivileges.mockReset();
  });

  it('should have a default value', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });

    expect(element.getByDisplayValue(expectedDefaultValue)).not.toBeNull();
  });

  it('should dispatch search action when submit search field', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render();
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.change(element.getByTestId('searchField'), {
        target: { value: expectedDefaultValue },
      });
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', false);
  });

  it('should dispatch search action when click on button', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(element.getByTestId('searchButton'));
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', true);
  });

  it('should hide refresh button', () => {
    const element = render({ hideRefreshButton: true });

    expect(element.queryByTestId('searchButton')).toBeNull();
  });

  it('should hide policies selector when no license', () => {
    const generator = new EndpointDocGenerator('policy-list');
    const policy = generator.generatePolicyPackagePolicy();
    mockUseUserPrivileges.mockReturnValue(
      loadedUserPrivilegesState({ canCreateArtifactsByPolicy: false })
    );
    const element = render({ policyList: [policy], hasPolicyFilter: true });

    expect(element.queryByTestId('policiesSelectorButton')).toBeNull();
  });

  it('should display policies selector when right license', () => {
    const generator = new EndpointDocGenerator('policy-list');
    const policy = generator.generatePolicyPackagePolicy();
    mockUseUserPrivileges.mockReturnValue(
      loadedUserPrivilegesState({ canCreateArtifactsByPolicy: true })
    );
    const element = render({ policyList: [policy], hasPolicyFilter: true });

    expect(element.queryByTestId('policiesSelectorButton')).not.toBeNull();
  });
});
