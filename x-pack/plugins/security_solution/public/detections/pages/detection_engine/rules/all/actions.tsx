/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as H from 'history';
import React, { Dispatch } from 'react';

import {
  deleteRules,
  duplicateRules,
  enableRules,
  Rule,
} from '../../../../containers/detection_engine/rules';

import { getEditRuleUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';

import {
  ActionToaster,
  displayErrorToast,
  displaySuccessToast,
  errorToToaster,
} from '../../../../../common/components/toasters';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../../../common/lib/telemetry';

import * as i18n from '../translations';
import { bucketRulesResponse } from './helpers';
import { Action } from './reducer';

export const editRuleAction = (rule: Rule, history: H.History) => {
  history.push(getEditRuleUrl(rule.id));
};

export const duplicateRulesAction = async (
  rules: Rule[],
  ruleIds: string[],
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  try {
    dispatch({ type: 'loadingRuleIds', ids: ruleIds, actionType: 'duplicate' });
    const response = await duplicateRules({ rules });
    const { errors } = bucketRulesResponse(response);
    if (errors.length > 0) {
      displayErrorToast(
        i18n.DUPLICATE_RULE_ERROR,
        errors.map((e) => e.error.message),
        dispatchToaster
      );
    } else {
      displaySuccessToast(i18n.SUCCESSFULLY_DUPLICATED_RULES(ruleIds.length), dispatchToaster);
    }
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  } catch (error) {
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
    errorToToaster({ title: i18n.DUPLICATE_RULE_ERROR, error, dispatchToaster });
  }
};

export const exportRulesAction = (exportRuleId: string[], dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'exportRuleIds', ids: exportRuleId });
};

export const deleteRulesAction = async (
  ruleIds: string[],
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  onRuleDeleted?: () => void
) => {
  try {
    dispatch({ type: 'loadingRuleIds', ids: ruleIds, actionType: 'delete' });
    const response = await deleteRules({ ids: ruleIds });
    const { errors } = bucketRulesResponse(response);
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
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
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
    errorToToaster({
      title: i18n.BATCH_ACTION_DELETE_SELECTED_ERROR(ruleIds.length),
      error,
      dispatchToaster,
    });
  }
};

export const enableRulesAction = async (
  ids: string[],
  enabled: boolean,
  dispatch: React.Dispatch<Action>,
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
    dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
  }
};
