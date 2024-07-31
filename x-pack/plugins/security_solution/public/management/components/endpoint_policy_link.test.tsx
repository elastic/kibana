/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, UserPrivilegesMockSetter } from '../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../common/mock/endpoint';
import React from 'react';
import type { EndpointPolicyLinkProps } from './endpoint_policy_link';
import { EndpointPolicyLink, POLICY_NOT_FOUND_MESSAGE } from './endpoint_policy_link';
import { useUserPrivileges as _useUserPrivileges } from '../../common/components/user_privileges';

jest.mock('../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('EndpointPolicyLink component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let props: EndpointPolicyLinkProps;
  let authzSettter: UserPrivilegesMockSetter;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    props = {
      policyId: 'abc-123',
      'data-test-subj': 'test',
      children: 'policy name here',
    };

    authzSettter = appTestContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);

    render = () => {
      renderResult = appTestContext.render(<EndpointPolicyLink {...props} />);
      return renderResult;
    };
  });

  afterEach(() => {
    authzSettter.reset();
  });

  it('should display policy as a link to policy details page', () => {
    const { getByTestId, queryByTestId } = render();

    expect(getByTestId('test-displayContent')).toHaveTextContent(props.children as string);
    expect(getByTestId('test-link')).toBeTruthy();
    expect(queryByTestId('test-revision')).toBeNull();
    expect(queryByTestId('test-outdatedMsg')).toBeNull();
    expect(queryByTestId('test-policyNotFoundMsg')).toBeNull();
  });

  it('should display regular text (no link) if user has no authz to read policy details', () => {
    authzSettter.set({ canReadPolicyManagement: false });
    const { getByTestId, queryByTestId } = render();

    expect(getByTestId('test-displayContent')).toHaveTextContent(props.children as string);
    expect(queryByTestId('test-link')).toBeNull();
  });

  it('should display regular text (no link) if policy does not exist', () => {
    props.policyExists = false;
    const { getByTestId, queryByTestId } = render();

    expect(getByTestId('test-displayContent')).toHaveTextContent(props.children as string);
    expect(queryByTestId('test-link')).toBeNull();
  });

  it('should display regular text (no link) if policy id is empty string', () => {
    props.policyId = '';
    const { getByTestId, queryByTestId } = render();

    expect(getByTestId('test-displayContent')).toHaveTextContent(props.children as string);
    expect(queryByTestId('test-link')).toBeNull();
  });

  it('should display revision', () => {
    props.revision = 10;
    const { getByTestId } = render();

    expect(getByTestId('test-revision')).toHaveTextContent('rev. 10');
  });

  it('should display out-of-date message', () => {
    props.isOutdated = true;
    const { getByTestId } = render();

    expect(getByTestId('test-outdatedMsg')).toHaveTextContent('Out-of-date');
  });

  it('should display policy no longer available', () => {
    props.policyExists = false;
    const { getByTestId } = render();

    expect(getByTestId('test-policyNotFoundMsg')).toHaveTextContent(POLICY_NOT_FOUND_MESSAGE);
  });

  it('should display all info. when policy is missing and out of date', () => {
    props.revision = 10;
    props.isOutdated = true;
    props.policyExists = false;
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual('policy name hererev. 10Out-of-date');
  });
});
