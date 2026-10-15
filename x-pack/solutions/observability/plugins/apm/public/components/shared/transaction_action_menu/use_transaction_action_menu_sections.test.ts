/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useExternalTransactionActions } from './use_transaction_action_menu_sections';

jest.mock('../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const transaction = {
  transaction: { id: 'tx-1' },
  event: { outcome: 'success' },
} as unknown as Transaction;

describe('useExternalTransactionActions', () => {
  const execute = jest.fn();
  const getTriggerCompatibleActions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getTriggerCompatibleActions.mockResolvedValue([
      {
        id: 'withHref',
        getDisplayName: () => 'Open elsewhere',
        getHref: async () => '/elsewhere',
        execute,
      },
      {
        id: 'clickOnly',
        getDisplayName: () => 'Do something',
        execute,
      },
    ]);
    mockUseApmPluginContext.mockReturnValue({
      uiActions: { getTriggerCompatibleActions },
    } as unknown as ReturnType<typeof useApmPluginContext>);
  });

  it('resolves registered actions with string names, hrefs, and execute handlers', async () => {
    const { result } = renderHook(() => useExternalTransactionActions(transaction));

    await waitFor(() => expect(result.current).toHaveLength(2));

    expect(getTriggerCompatibleActions).toHaveBeenCalledWith(
      O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER,
      transaction
    );
    expect(result.current).toEqual([
      { id: 'withHref', name: 'Open elsewhere', href: '/elsewhere', onClick: expect.any(Function) },
      { id: 'clickOnly', name: 'Do something', href: undefined, onClick: expect.any(Function) },
    ]);

    result.current[1].onClick();
    expect(execute).toHaveBeenCalledWith({
      ...transaction,
      trigger: { id: O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER },
    });
  });

  it('resolves no actions without a transaction', async () => {
    const { result } = renderHook(() => useExternalTransactionActions(undefined));

    await waitFor(() => expect(result.current).toEqual([]));
    expect(getTriggerCompatibleActions).not.toHaveBeenCalled();
  });
});
