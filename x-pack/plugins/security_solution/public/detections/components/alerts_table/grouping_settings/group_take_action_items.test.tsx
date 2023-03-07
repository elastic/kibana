/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { useGroupTakeActionsItems } from '.';

jest.mock('../../../../common/store', () => ({
  inputsSelectors: {
    globalQuery: jest.fn(),
  },
  inputsModel: {},
}));

jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: () => jest.fn(),
}));

describe('useGroupTakeActionsItems', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  it('returns array take actions items available for alerts table if showAlertStatusActions is true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () =>
          useGroupTakeActionsItems({
            indexName: '.alerts-security.alerts-default',
            showAlertStatusActions: true,
          }),
        {
          wrapper: wrapperContainer,
        }
      );
      await waitForNextUpdate();
      expect(result.current().length).toEqual(3);
    });
  });

  it('returns  empty array of take actions items available for alerts table if showAlertStatusActions is false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () =>
          useGroupTakeActionsItems({
            indexName: '.alerts-security.alerts-default',
            showAlertStatusActions: false,
          }),
        {
          wrapper: wrapperContainer,
        }
      );
      await waitForNextUpdate();
      expect(result.current().length).toEqual(0);
    });
  });
});
