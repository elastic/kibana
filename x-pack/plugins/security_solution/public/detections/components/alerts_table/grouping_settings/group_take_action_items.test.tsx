/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { useGroupTakeActionsItems } from '.';

describe('useGroupTakeActionsItems', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  const getActionItemsParams = {
    tableId: 'mock-id',
    groupNumber: 0,
    selectedGroup: 'test',
  };
  it('returns all take actions items if showAlertStatusActions is true and currentStatus is undefined', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => expect(result.current(getActionItemsParams).length).toEqual(3));
  });

  it('returns all take actions items if currentStatus is []', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: [],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => expect(result.current(getActionItemsParams).length).toEqual(3));
  });

  it('returns all take actions items if currentStatus.length > 1', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['open', 'closed'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => expect(result.current(getActionItemsParams).length).toEqual(3));
  });

  it('returns acknowledged & closed take actions items if currentStatus === ["open"]', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['open'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => {
      const currentParams = result.current(getActionItemsParams);
      expect(currentParams.length).toEqual(2);
      expect(currentParams[0].key).toEqual('acknowledge');
      expect(currentParams[1].key).toEqual('close');
    });
  });

  it('returns open & acknowledged take actions items if currentStatus === ["closed"]', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['closed'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => {
      const currentParams = result.current(getActionItemsParams);
      expect(currentParams.length).toEqual(2);
      expect(currentParams[0].key).toEqual('open');
      expect(currentParams[1].key).toEqual('acknowledge');
    });
  });

  it('returns open & closed take actions items if currentStatus === ["acknowledged"]', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['acknowledged'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => {
      const currentParams = result.current(getActionItemsParams);
      expect(currentParams.length).toEqual(2);
      expect(currentParams[0].key).toEqual('open');
      expect(currentParams[1].key).toEqual('close');
    });
  });

  it('returns empty take actions items if showAlertStatusActions is false', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          showAlertStatusActions: false,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => expect(result.current(getActionItemsParams).length).toEqual(0));
  });

  it('returns array take actions items if showAlertStatusActions is true', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => expect(result.current(getActionItemsParams).length).toEqual(3));
  });
});
