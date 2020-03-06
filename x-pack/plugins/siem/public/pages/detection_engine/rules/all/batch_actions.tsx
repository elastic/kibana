/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { Dispatch } from 'react';
import * as i18n from '../translations';
import { Action } from './reducer';
import {
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
} from './actions';
import { ActionToaster } from '../../../../components/toasters';
import { Rule } from '../../../../containers/detection_engine/rules';

interface GetBatchItems {
  closePopover: () => void;
  dispatch: Dispatch<Action>;
  dispatchToaster: Dispatch<ActionToaster>;
  loadingRuleIds: string[];
  reFetchRules: (refreshPrePackagedRule?: boolean) => void;
  rules: Rule[];
  selectedRuleIds: string[];
}

export const getBatchItems = ({
  closePopover,
  dispatch,
  dispatchToaster,
  loadingRuleIds,
  reFetchRules,
  rules,
  selectedRuleIds,
}: GetBatchItems) => {
  const containsEnabled = selectedRuleIds.some(
    id => rules.find(r => r.id === id)?.enabled ?? false
  );
  const containsDisabled = selectedRuleIds.some(
    id => !rules.find(r => r.id === id)?.enabled ?? false
  );
  const containsLoading = selectedRuleIds.some(id => loadingRuleIds.includes(id));
  const containsImmutable = selectedRuleIds.some(
    id => rules.find(r => r.id === id)?.immutable ?? false
  );

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
      icon="checkInCircleFilled"
      disabled={containsLoading || !containsDisabled}
      onClick={async () => {
        closePopover();
        const deactivatedIds = selectedRuleIds.filter(
          id => !rules.find(r => r.id === id)?.enabled ?? false
        );
        await enableRulesAction(deactivatedIds, true, dispatch, dispatchToaster);
      }}
    >
      {i18n.BATCH_ACTION_ACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
      icon="crossInACircleFilled"
      disabled={containsLoading || !containsEnabled}
      onClick={async () => {
        closePopover();
        const activatedIds = selectedRuleIds.filter(
          id => rules.find(r => r.id === id)?.enabled ?? false
        );
        await enableRulesAction(activatedIds, false, dispatch, dispatchToaster);
      }}
    >
      {i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_EXPORT_SELECTED}
      icon="exportAction"
      disabled={containsImmutable || containsLoading || selectedRuleIds.length === 0}
      onClick={() => {
        closePopover();
        exportRulesAction(
          rules.filter(r => selectedRuleIds.includes(r.id)).map(r => r.rule_id),
          dispatch
        );
      }}
    >
      {i18n.BATCH_ACTION_EXPORT_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DUPLICATE_SELECTED}
      icon="copy"
      disabled={containsLoading || selectedRuleIds.length === 0}
      onClick={async () => {
        closePopover();
        await duplicateRulesAction(
          rules.filter(r => selectedRuleIds.includes(r.id)),
          selectedRuleIds,
          dispatch,
          dispatchToaster
        );
        reFetchRules(true);
      }}
    >
      {i18n.BATCH_ACTION_DUPLICATE_SELECTED}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_DELETE_SELECTED}
      icon="trash"
      title={containsImmutable ? i18n.BATCH_ACTION_DELETE_SELECTED_IMMUTABLE : undefined}
      disabled={containsLoading || selectedRuleIds.length === 0}
      onClick={async () => {
        closePopover();
        await deleteRulesAction(selectedRuleIds, dispatch, dispatchToaster);
        reFetchRules(true);
      }}
    >
      {i18n.BATCH_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
