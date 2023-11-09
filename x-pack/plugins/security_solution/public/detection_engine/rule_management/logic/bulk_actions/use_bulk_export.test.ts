/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useBulkExportMutation } from '../../api/hooks/use_bulk_export_mutation';
import type { QueryOrIds } from '../../api/api';
import { useBulkExport } from './use_bulk_export';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../api/hooks/use_bulk_export_mutation');
jest.mock('../../../rule_management_ui/components/rules_table/rules_table/rules_table_context');

async function bulkExport(queryOrIds: QueryOrIds): Promise<void> {
  const {
    result: {
      current: { bulkExport: bulkExportFn },
    },
  } = renderHook(() => useBulkExport());

  await bulkExportFn(queryOrIds);
}

describe('useBulkExport', () => {
  let mutateAsync: jest.Mock;
  let toasts: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    mutateAsync = jest.fn().mockResolvedValue({
      attributes: {
        results: {
          updated: [{ immutable: true }, { immutable: false }],
        },
        summary: {
          total: 2,
          succeeded: 2,
        },
      },
    });
    (useBulkExportMutation as jest.Mock).mockReturnValue({ mutateAsync });

    toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
    };
    (useAppToasts as jest.Mock).mockReturnValue(toasts);
  });

  it('executes bulk export action', async () => {
    await bulkExport({ query: 'some query' });

    expect(mutateAsync).toHaveBeenCalledWith({ query: 'some query' });
  });

  describe('state handlers', () => {
    it('shows error toast upon failure', async () => {
      (useBulkExportMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockRejectedValue(new Error()),
      });

      await bulkExport({ ids: ['ruleId1'] });

      expect(toasts.addError).toHaveBeenCalled();
    });
  });

  describe('when rules table context is available', () => {
    let setLoadingRules: jest.Mock;

    beforeEach(() => {
      setLoadingRules = jest.fn();
      (useRulesTableContextOptional as jest.Mock).mockReturnValue({
        actions: {
          setLoadingRules,
        },
        state: {
          isAllSelected: false,
        },
      });
    });

    it('sets the loading state before execution', async () => {
      await bulkExport({ ids: ['ruleId1', 'ruleId2'] });

      expect(setLoadingRules).toHaveBeenCalledWith({
        ids: ['ruleId1', 'ruleId2'],
        action: BulkActionTypeEnum.export,
      });
    });

    it('sets the empty loading state before execution when query is set', async () => {
      await bulkExport({ query: 'some query' });

      expect(setLoadingRules).toHaveBeenCalledWith({
        ids: [],
        action: BulkActionTypeEnum.export,
      });
    });

    it('clears loading state for the processing rules after execution', async () => {
      await bulkExport({ ids: ['ruleId1', 'ruleId2'] });

      expect(setLoadingRules).toHaveBeenCalledWith({ ids: [], action: null });
    });

    it('clears loading state for the processing rules after execution failure', async () => {
      (useBulkExportMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockRejectedValue(new Error()),
      });

      await bulkExport({ ids: ['ruleId1', 'ruleId2'] });

      expect(setLoadingRules).toHaveBeenCalledWith({ ids: [], action: null });
    });
  });
});
