/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { render, WrappedHelper } from '../utils/testing';
import { useSyntheticsPrivileges } from './use_synthetics_priviliges';

jest.mock('../../../hooks/use_capabilities', () => ({
  useCanReadSyntheticsIndex: jest.fn().mockReturnValue({ canRead: true, loading: false }),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn().mockReturnValue({ error: { body: { message: 'License not active' } } }),
  };
});

function wrapper({ children }: { children: React.ReactElement }) {
  return <WrappedHelper>{children}</WrappedHelper>;
}

describe('useSyntheticsPrivileges', () => {
  it.each([
    [true, null],
    [false, ''],
  ])(
    'should correctly set the disabled prop of the license nav button if `licenseManagement` enabled is %s',
    (enabled, expectedDisabledAttribute) => {
      const {
        result: { current },
      } = renderHook(() => useSyntheticsPrivileges(), { wrapper });

      expect(current).not.toBeUndefined();

      const { getByLabelText } = render(current!, {
        core: {
          licenseManagement: { enabled },
        },
      });

      const licenseNavButton = getByLabelText('Navigate to license management');

      expect(licenseNavButton);

      // there should only be an href if the license management is enabled, otherwise we render a disabled button with no handler
      expect(!!licenseNavButton.getAttribute('href')).toEqual(enabled);
      expect(licenseNavButton.getAttribute('disabled')).toEqual(expectedDisabledAttribute);
    }
  );
});
