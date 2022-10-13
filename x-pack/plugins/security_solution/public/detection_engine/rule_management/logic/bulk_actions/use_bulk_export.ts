/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { BulkActionResponse, BulkActionSummary } from '..';
import { BulkAction } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type { HTTPError } from '../../../../../common/detection_engine/types';
import type { UseAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { downloadBlob } from '../../../../common/utils/download_blob';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { getExportedRulesCounts } from '../../../rule_management_ui/components/rules_table/helpers';
import type { RulesTableActions } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useBulkExportMutation } from '../../api/hooks/use_bulk_export_mutation';
import { getErrorToastContent, getSuccessToastContent } from './translations';

type OnActionSuccessCallback = (
  toasts: UseAppToasts,
  action: BulkAction,
  summary: BulkActionSummary
) => void;

type OnActionErrorCallback = (toasts: UseAppToasts, action: BulkAction, error: HTTPError) => void;

interface RulesBulkActionArgs {
  visibleRuleIds?: string[];
  search: { query: string } | { ids: string[] };
  setLoadingRules?: RulesTableActions['setLoadingRules'];
}

export const useBulkExport = () => {
  const toasts = useAppToasts();
  const { mutateAsync } = useBulkExportMutation();

  const bulkExport = useCallback(
    async ({ visibleRuleIds = [], setLoadingRules, search }: RulesBulkActionArgs) => {
      try {
        setLoadingRules?.({ ids: visibleRuleIds, action: BulkAction.export });
        return await mutateAsync(search);
      } catch (error) {
        defaultErrorHandler(toasts, error);
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [mutateAsync, toasts]
  );

  return { bulkExport };
};

/**
 * downloads exported rules, received from export action
 * @param params.response - Blob results with exported rules
 * @param params.toasts - {@link UseAppToasts} toasts service
 * @param params.onSuccess - {@link OnActionSuccessCallback} optional toast to display when action successful
 * @param params.onError - {@link OnActionErrorCallback} optional toast to display when action failed
 */
export async function downloadExportedRules({
  response,
  toasts,
}: {
  response: Blob;
  toasts: UseAppToasts;
  // TODO: https://github.com/elastic/kibana/pull/142950 Callbacks are not used
  onSuccess?: OnActionSuccessCallback;
  onError?: OnActionErrorCallback;
}) {
  try {
    downloadBlob(response, `${i18n.EXPORT_FILENAME}.ndjson`);
    defaultSuccessHandler(toasts, await getExportedRulesCounts(response));
  } catch (error) {
    defaultErrorHandler(toasts, error);
  }
}

function defaultErrorHandler(toasts: UseAppToasts, error: HTTPError): void {
  const summary = (error?.body as BulkActionResponse)?.attributes?.summary;
  error.stack = JSON.stringify(error.body, null, 2);

  toasts.addError(error, getErrorToastContent(BulkAction.export, summary));
}

function defaultSuccessHandler(toasts: UseAppToasts, summary: BulkActionSummary): void {
  toasts.addSuccess(getSuccessToastContent(BulkAction.export, summary));
}
