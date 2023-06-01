/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SECURITY_SOLUTION_OWNER } from '../../../../common';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import CasesProvider from '../../cases_context';
import { ActionWrapper } from './action_wrapper';
import { getMockCaseUiActionProps } from './mocks';

jest.mock('../../cases_context', () =>
  jest.fn().mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>)
);

jest.mock('../../../client/helpers/can_use_cases', () => {
  const actual = jest.requireActual('../../../client/helpers/can_use_cases');
  return {
    ...actual,
    canUseCases: jest.fn(),
  };
});

const mockCasePermissions = jest.fn().mockReturnValue({ create: true, update: true });

jest.mock('../../../../common/utils/owner', () => ({
  getCaseOwnerByAppId: jest.fn().mockReturnValue('securitySolution'),
}));

describe('ActionWrapper', () => {
  const props = { ...getMockCaseUiActionProps(), currentAppId: 'securitySolutionUI' };

  beforeEach(() => {
    jest.clearAllMocks();
    (canUseCases as jest.Mock).mockReturnValue(mockCasePermissions);
  });

  test('it reads cases permissions', () => {
    render(
      <ActionWrapper {...props}>
        <div />
      </ActionWrapper>
    );
    expect(mockCasePermissions).toHaveBeenCalledWith([SECURITY_SOLUTION_OWNER]);
  });

  test('it renders CasesProvider with correct props', () => {
    render(
      <ActionWrapper {...props}>
        <div />
      </ActionWrapper>
    );
    expect((CasesProvider as jest.Mock).mock.calls[0][0].value).toMatchInlineSnapshot(`
      Object {
        "features": Object {
          "alerts": Object {
            "sync": true,
          },
        },
        "owner": Array [
          "securitySolution",
        ],
        "permissions": Object {
          "create": true,
          "update": true,
        },
      }
    `);
  });

  test('should check permission with undefined if owner is not found', () => {
    (getCaseOwnerByAppId as jest.Mock).mockReturnValue(undefined);

    render(
      <ActionWrapper {...props}>
        <div />
      </ActionWrapper>
    );
    expect(mockCasePermissions).toBeCalledWith(undefined);
  });
});
