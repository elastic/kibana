/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem, EuiToolTip } from '@elastic/eui';
import React, { Dispatch } from 'react';
import * as i18n from '../translations';
import { Action } from './reducer';
import {
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
} from './actions';
import { ActionToaster, displayWarningToast } from '../../../../../common/components/toasters';
import { Rule } from '../../../../containers/detection_engine/rules';
import * as detectionI18n from '../../translations';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';

interface GetBatchItems {
  closePopover: () => void;
  dispatch: Dispatch<Action>;
  dispatchToaster: Dispatch<ActionToaster>;
  hasMlPermissions: boolean;
  hasActionsPrivileges: boolean;
  loadingRuleIds: string[];
  reFetchRules: () => Promise<void>;
  refetchPrePackagedRulesStatus: () => Promise<void>;
  rules: Rule[];
  selectedRuleIds: string[];
}

export const getBatchItems = ({
  closePopover,
  dispatch,
  dispatchToaster,
  hasMlPermissions,
  loadingRuleIds,
  reFetchRules,
  refetchPrePackagedRulesStatus,
  rules,
  selectedRuleIds,
  hasActionsPrivileges,
}: GetBatchItems) => {
  const selectedRules = selectedRuleIds.reduce<Record<string, Rule>>((acc, id) => {
    const found = rules.find((r) => r.id === id);
    if (found != null) {
      return { [id]: found, ...acc };
    }
    return acc;
  }, {});

  const containsEnabled = selectedRuleIds.some((id) => selectedRules[id]?.enabled ?? false);
  const containsDisabled = selectedRuleIds.some((id) => !selectedRules[id]?.enabled ?? false);
  const containsLoading = selectedRuleIds.some((id) => loadingRuleIds.includes(id));
  const containsImmutable = selectedRuleIds.some((id) => selectedRules[id]?.immutable ?? false);

  const missingActionPrivileges =
    !hasActionsPrivileges &&
    selectedRuleIds.some((id) => {
      return !canEditRuleWithActions(selectedRules[id], hasActionsPrivileges);
    });

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
      icon="checkInCircleFilled"
      disabled={missingActionPrivileges || containsLoading || !containsDisabled}
      onClick={async () => {
        closePopover();
        const deactivatedIds = selectedRuleIds.filter((id) => !selectedRules[id]?.enabled ?? false);

        const deactivatedIdsNoML = deactivatedIds.filter(
          (id) => !isMlRule(selectedRules[id]?.type)
        );

        const mlRuleCount = deactivatedIds.length - deactivatedIdsNoML.length;
        if (!hasMlPermissions && mlRuleCount > 0) {
          displayWarningToast(detectionI18n.ML_RULES_UNAVAILABLE(mlRuleCount), dispatchToaster);
        }

        await enableRulesAction(
          hasMlPermissions ? deactivatedIds : deactivatedIdsNoML,
          true,
          dispatch,
          dispatchToaster
        );
      }}
    >
      <EuiToolTip
        position="right"
        content={missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined}
      >
        <>{i18n.BATCH_ACTION_ACTIVATE_SELECTED}</>
      </EuiToolTip>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
      icon="crossInACircleFilled"
      disabled={missingActionPrivileges || containsLoading || !containsEnabled}
      onClick={async () => {
        closePopover();
        const activatedIds = selectedRuleIds.filter((id) => selectedRules[id]?.enabled ?? false);
        await enableRulesAction(activatedIds, false, dispatch, dispatchToaster);
      }}
    >
      <EuiToolTip
        position="right"
        content={missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined}
      >
        <>{i18n.BATCH_ACTION_DEACTIVATE_SELECTED}</>
      </EuiToolTip>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EXPORT_SELECTED}
      icon="exportAction"
      disabled={containsImmutable || containsLoading || selectedRuleIds.length === 0}
      onClick={() => {
        closePopover();
        exportRulesAction(
          rules.filter((r) => selectedRuleIds.includes(r.id)).map((r) => r.rule_id),
          dispatch
        );
      }}
    >
      {i18n.BATCH_ACTION_EXPORT_SELECTED}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DUPLICATE_SELECTED}
      icon="copy"
      disabled={missingActionPrivileges || containsLoading || selectedRuleIds.length === 0}
      onClick={async () => {
        closePopover();
        await duplicateRulesAction(
          rules.filter((r) => selectedRuleIds.includes(r.id)),
          selectedRuleIds,
          dispatch,
          dispatchToaster
        );
        await reFetchRules();
        await refetchPrePackagedRulesStatus();
      }}
    >
      <EuiToolTip
        position="right"
        content={missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined}
      >
        <>{i18n.BATCH_ACTION_DUPLICATE_SELECTED}</>
      </EuiToolTip>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="deleteRuleBulk"
      key={i18n.BATCH_ACTION_DELETE_SELECTED}
      icon="trash"
      title={containsImmutable ? i18n.BATCH_ACTION_DELETE_SELECTED_IMMUTABLE : undefined}
      disabled={containsLoading || selectedRuleIds.length === 0}
      onClick={async () => {
        closePopover();
        await deleteRulesAction(selectedRuleIds, dispatch, dispatchToaster);
        await reFetchRules();
        await refetchPrePackagedRulesStatus();
      }}
    >
      {i18n.BATCH_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
