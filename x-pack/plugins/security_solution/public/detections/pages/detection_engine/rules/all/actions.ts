/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'react';
import type { NavigateToAppOptions } from '../../../../../../../../../src/core/public';

import type { UseAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { APP_UI_ID } from '../../../../../../common/constants';
import {
  BulkAction,
  BulkActionEditPayload,
} from '../../../../../../common/detection_engine/schemas/common/schemas';
import { CreateRulesSchema } from '../../../../../../common/detection_engine/schemas/request';
import { SecurityPageName } from '../../../../../app/types';
import { getEditRuleUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import {
  ActionToaster,
  displayErrorToast,
  displaySuccessToast,
  errorToToaster,
} from '../../../../../common/components/toasters';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../common/lib/telemetry';
import { downloadBlob } from '../../../../../common/utils/download_blob';
import {
  deleteRules,
  duplicateRules,
  enableRules,
  exportRules,
  performBulkAction,
  Rule,
} from '../../../../containers/detection_engine/rules';
import { RulesTableActions } from './rules_table/rules_table_context';
import { transformOutput } from '../../../../containers/detection_engine/rules/transforms';
import * as i18n from '../translations';
import { bucketRulesResponse, getExportedRulesCounts } from './helpers';

export const editRuleAction = (
  ruleId: string,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>
) => {
  navigateToApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(ruleId ?? ''),
  });
};

export const duplicateRulesAction = async (
  rules: Rule[],
  ruleIds: string[],
  dispatchToaster: Dispatch<ActionToaster>,
  setLoadingRules: RulesTableActions['setLoadingRules']
): Promise<Rule[] | undefined> => {
  try {
    setLoadingRules({ ids: ruleIds, action: 'duplicate' });
    const response = await duplicateRules({
      // We cast this back and forth here as the front end types are not really the right io-ts ones
      // and the two types conflict with each other.
      rules: rules.map((rule) => transformOutput(rule as CreateRulesSchema) as Rule),
    });
    const { errors, rules: createdRules } = bucketRulesResponse(response);
    if (errors.length > 0) {
      displayErrorToast(
        i18n.DUPLICATE_RULE_ERROR,
        errors.map((e) => e.error.message),
        dispatchToaster
      );
    } else {
      displaySuccessToast(i18n.SUCCESSFULLY_DUPLICATED_RULES(ruleIds.length), dispatchToaster);
    }
    return createdRules;
  } catch (error) {
    errorToToaster({ title: i18n.DUPLICATE_RULE_ERROR, error, dispatchToaster });
  } finally {
    setLoadingRules({ ids: [], action: null });
  }
};

export const exportRulesAction = async (
  exportRuleId: string[],
  dispatchToaster: Dispatch<ActionToaster>,
  setLoadingRules: RulesTableActions['setLoadingRules']
) => {
  try {
    setLoadingRules({ ids: exportRuleId, action: 'export' });
    const blob = await exportRules({ ids: exportRuleId });
    downloadBlob(blob, `${i18n.EXPORT_FILENAME}.ndjson`);

    const { exported } = await getExportedRulesCounts(blob);
    displaySuccessToast(
      i18n.SUCCESSFULLY_EXPORTED_RULES(exported, exportRuleId.length),
      dispatchToaster
    );
  } catch (e) {
    displayErrorToast(i18n.BULK_ACTION_FAILED, [e.message], dispatchToaster);
  } finally {
    setLoadingRules({ ids: [], action: null });
  }
};

export const deleteRulesAction = async (
  ruleIds: string[],
  dispatchToaster: Dispatch<ActionToaster>,
  setLoadingRules: RulesTableActions['setLoadingRules'],
  onRuleDeleted?: () => void
) => {
  try {
    setLoadingRules({ ids: ruleIds, action: 'delete' });
    const response = await deleteRules({ ids: ruleIds });
    const { errors } = bucketRulesResponse(response);
    if (errors.length > 0) {
      displayErrorToast(
        i18n.BATCH_ACTION_DELETE_SELECTED_ERROR(ruleIds.length),
        errors.map((e) => e.error.message),
        dispatchToaster
      );
    } else if (onRuleDeleted) {
      onRuleDeleted();
    }
  } catch (error) {
    errorToToaster({
      title: i18n.BATCH_ACTION_DELETE_SELECTED_ERROR(ruleIds.length),
      error,
      dispatchToaster,
    });
  } finally {
    setLoadingRules({ ids: [], action: null });
  }
};

export const enableRulesAction = async (
  ids: string[],
  enabled: boolean,
  dispatchToaster: Dispatch<ActionToaster>,
  setLoadingRules?: RulesTableActions['setLoadingRules']
) => {
  const errorTitle = enabled
    ? i18n.BATCH_ACTION_ENABLE_SELECTED_ERROR(ids.length)
    : i18n.BATCH_ACTION_DISABLE_SELECTED_ERROR(ids.length);

  try {
    setLoadingRules?.({ ids, action: enabled ? 'enable' : 'disable' });

    const response = await enableRules({ ids, enabled });
    const { rules, errors } = bucketRulesResponse(response);

    if (errors.length > 0) {
      displayErrorToast(
        errorTitle,
        errors.map((e) => e.error.message),
        dispatchToaster
      );
    }

    if (rules.some((rule) => rule.immutable)) {
      track(
        METRIC_TYPE.COUNT,
        enabled ? TELEMETRY_EVENT.SIEM_RULE_ENABLED : TELEMETRY_EVENT.SIEM_RULE_DISABLED
      );
    }
    if (rules.some((rule) => !rule.immutable)) {
      track(
        METRIC_TYPE.COUNT,
        enabled ? TELEMETRY_EVENT.CUSTOM_RULE_ENABLED : TELEMETRY_EVENT.CUSTOM_RULE_DISABLED
      );
    }

    return rules;
  } catch (e) {
    displayErrorToast(errorTitle, [e.message], dispatchToaster);
  } finally {
    setLoadingRules?.({ ids: [], action: null });
  }
};

interface ExecuteRulesBulkActionArgs {
  visibleRuleIds: string[];
  action: BulkAction;
  toasts: UseAppToasts;
  search: { query: string } | { ids: string[] };
  payload?: { edit?: BulkActionEditPayload[] };
  onSuccess?: (arg: { rulesCount: number }) => void;
  onError?: (error: Error) => void;
  setLoadingRules: RulesTableActions['setLoadingRules'];
}

const executeRulesBulkAction = async ({
  visibleRuleIds,
  action,
  setLoadingRules,
  toasts,
  search,
  payload,
  onSuccess,
  onError,
}: ExecuteRulesBulkActionArgs) => {
  try {
    setLoadingRules({ ids: visibleRuleIds, action });

    if (action === BulkAction.export) {
      const blob = await performBulkAction({ ...search, action });
      downloadBlob(blob, `${i18n.EXPORT_FILENAME}.ndjson`);
      const { exported, total } = await getExportedRulesCounts(blob);

      toasts.addSuccess(i18n.SUCCESSFULLY_EXPORTED_RULES(exported, total));
    } else {
      const response = await performBulkAction({ ...search, action, edit: payload?.edit });

      onSuccess?.({ rulesCount: response.attributes.summary.succeeded });
    }
  } catch (e) {
    if (onError) {
      onError(e);
    } else {
      toasts.addError(e, { title: i18n.BULK_ACTION_FAILED });
    }
  } finally {
    setLoadingRules({ ids: [], action: null });
  }
};

export const initRulesBulkAction = (params: Omit<ExecuteRulesBulkActionArgs, 'search'>) => {
  const byQuery = (query: string) =>
    executeRulesBulkAction({
      ...params,
      search: { query },
    });

  const byIds = (ids: string[]) =>
    executeRulesBulkAction({
      ...params,
      search: { ids },
    });

  return {
    byQuery,
    byIds,
  };
};
