/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';

import { useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { useReadonlyHeader } from './use_readonly_header';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../common/lib/kibana');

const mockedSetBadge = jest.fn();

describe('CaseContainerComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.chrome.setBadge = mockedSetBadge;
  });

  it('does not display the readonly glasses badge when the user has write permissions', () => {
    renderHook(() => useReadonlyHeader(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(mockedSetBadge).not.toBeCalled();
  });

  it('displays the readonly glasses badge read permissions but not write', () => {
    renderHook(() => useReadonlyHeader(), {
      wrapper: ({ children }) => <TestProviders userCanCrud={false}>{children}</TestProviders>,
    });

    expect(mockedSetBadge).toBeCalledTimes(1);
  });
});
