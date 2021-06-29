/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch } from 'react';
import { NavigateToAppOptions } from '../../../../../../../../../src/core/public';
import { APP_ID } from '../../../../../../common/constants';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/common/schemas';
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
  RulesTableAction,
} from '../../../../containers/detection_engine/rules';
import { transformOutput } from '../../../../containers/detection_engine/rules/transforms';
import * as i18n from '../translations';
import { bucketRulesResponse, getExportedRulesCount } from './helpers';

export const editRuleAction = (
  ruleId: string,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>
) => {
  navigateToApp(APP_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(ruleId ?? ''),
  });
};

export const duplicateRulesAction = async (
  rules: Rule[],
  ruleIds: string[],
  dispatch: React.Dispatch<RulesTableAction>,
  dispatchToaster: Dispatch<ActionToaster>
): Promise<Rule[] | undefined> => {
  try {
    dispatch({ type: 'loadingRuleIds', ids: ruleIds, actionType: 'duplicate' });
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
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  }
};

export const exportRulesAction = async (
  exportRuleId: string[],
  dispatch: React.Dispatch<RulesTableAction>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  try {
    dispatch({ type: 'loadingRuleIds', ids: exportRuleId, actionType: 'export' });
    const blob = await exportRules({ ids: exportRuleId });
    downloadBlob(blob, `${i18n.EXPORT_FILENAME}.ndjson`);

    const exportedRulesCount = await getExportedRulesCount(blob);
    displaySuccessToast(
      i18n.SUCCESSFULLY_EXPORTED_RULES(exportedRulesCount, exportRuleId.length),
      dispatchToaster
    );
  } catch (e) {
    displayErrorToast(i18n.BULK_ACTION_FAILED, [e.message], dispatchToaster);
  } finally {
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  }
};

export const deleteRulesAction = async (
  ruleIds: string[],
  dispatch: React.Dispatch<RulesTableAction>,
  dispatchToaster: Dispatch<ActionToaster>,
  onRuleDeleted?: () => void
) => {
  try {
    dispatch({ type: 'loadingRuleIds', ids: ruleIds, actionType: 'delete' });
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
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  }
};

export const enableRulesAction = async (
  ids: string[],
  enabled: boolean,
  dispatch: React.Dispatch<RulesTableAction>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  const errorTitle = enabled
    ? i18n.BATCH_ACTION_ACTIVATE_SELECTED_ERROR(ids.length)
    : i18n.BATCH_ACTION_DEACTIVATE_SELECTED_ERROR(ids.length);

  try {
    dispatch({ type: 'loadingRuleIds', ids, actionType: enabled ? 'enable' : 'disable' });

    const response = await enableRules({ ids, enabled });
    const { rules, errors } = bucketRulesResponse(response);

    dispatch({ type: 'updateRules', rules });

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
  } catch (e) {
    displayErrorToast(errorTitle, [e.message], dispatchToaster);
  } finally {
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  }
};

export const rulesBulkActionByQuery = async (
  visibleRuleIds: string[],
  selectedItemsCount: number,
  query: string,
  action: BulkAction,
  dispatch: React.Dispatch<RulesTableAction>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  try {
    dispatch({ type: 'loadingRuleIds', ids: visibleRuleIds, actionType: action });

    if (action === BulkAction.export) {
      const blob = await performBulkAction({ query, action });
      downloadBlob(blob, `${i18n.EXPORT_FILENAME}.ndjson`);

      const exportedRulesCount = await getExportedRulesCount(blob);
      displaySuccessToast(
        i18n.SUCCESSFULLY_EXPORTED_RULES(exportedRulesCount, selectedItemsCount),
        dispatchToaster
      );
    } else {
      await performBulkAction({ query, action });
    }
  } catch (e) {
    displayErrorToast(i18n.BULK_ACTION_FAILED, [e.message], dispatchToaster);
  } finally {
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  }
};
