/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import {
  EndpointPrivileges,
  useEndpointPrivileges,
} from '../../../common/components/user_privileges/endpoint/use_endpoint_privileges';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';

import { SearchExceptions, SearchExceptionsProps } from '.';
import { getEndpointPrivilegesInitialStateMock } from '../../../common/components/user_privileges/endpoint/mocks';
jest.mock('../../../common/components/user_privileges/endpoint/use_endpoint_privileges');

let onSearchMock: jest.Mock;
const mockUseEndpointPrivileges = useEndpointPrivileges as jest.Mock;

describe('Search exceptions', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<SearchExceptionsProps>
  ) => ReturnType<AppContextTestRender['render']>;

  const loadedUserEndpointPrivilegesState = (
    endpointOverrides: Partial<EndpointPrivileges> = {}
  ): EndpointPrivileges =>
    getEndpointPrivilegesInitialStateMock({
      isPlatinumPlus: false,
      ...endpointOverrides,
    });

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

    mockUseEndpointPrivileges.mockReturnValue(loadedUserEndpointPrivilegesState());
  });

  afterAll(() => {
    mockUseEndpointPrivileges.mockReset();
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
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', '');
  });

  it('should dispatch search action when click on button', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(element.getByTestId('searchButton'));
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', '');
  });

  it('should hide refresh button', () => {
    const element = render({ hideRefreshButton: true });

    expect(element.queryByTestId('searchButton')).toBeNull();
  });

  it('should hide policies selector when no license', () => {
    const generator = new EndpointDocGenerator('policy-list');
    const policy = generator.generatePolicyPackagePolicy();
    mockUseEndpointPrivileges.mockReturnValue(
      loadedUserEndpointPrivilegesState({ isPlatinumPlus: false })
    );
    const element = render({ policyList: [policy], hasPolicyFilter: true });

    expect(element.queryByTestId('policiesSelectorButton')).toBeNull();
  });

  it('should display policies selector when right license', () => {
    const generator = new EndpointDocGenerator('policy-list');
    const policy = generator.generatePolicyPackagePolicy();
    mockUseEndpointPrivileges.mockReturnValue(
      loadedUserEndpointPrivilegesState({ isPlatinumPlus: true })
    );
    const element = render({ policyList: [policy], hasPolicyFilter: true });

    expect(element.queryByTestId('policiesSelectorButton')).not.toBeNull();
  });
});
