/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { DuplicateOptions } from '../../../../../common/detection_engine/rule_management/constants';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useKibana } from '../../../../common/lib/kibana';
import { canEditRuleWithActions } from '../../../../common/utils/privileges';
import type { Rule } from '../../../../detection_engine/rule_management/logic';
import { useBulkExport } from '../../../../detection_engine/rule_management/logic/bulk_actions/use_bulk_export';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../../detection_engine/rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useDownloadExportedRules } from '../../../../detection_engine/rule_management/logic/bulk_actions/use_download_exported_rules';
import * as i18nActions from '../../../pages/detection_engine/rules/translations';
import * as i18n from './translations';

const MyEuiButtonIcon = styled(EuiButtonIcon)`
  &.euiButtonIcon {
    svg {
      transform: rotate(90deg);
    }
    border: 1px solid ${({ theme }) => theme.euiColorPrimary};
    width: 40px;
    height: 40px;
  }
`;

interface RuleActionsOverflowComponentProps {
  rule: Rule | null;
  userHasPermissions: boolean;
  canDuplicateRuleWithActions: boolean;
  showBulkDuplicateExceptionsConfirmation: () => Promise<string | null>;
}

/**
 * Overflow Actions for a Rule
 */
const RuleActionsOverflowComponent = ({
  rule,
  userHasPermissions,
  canDuplicateRuleWithActions,
  showBulkDuplicateExceptionsConfirmation,
}: RuleActionsOverflowComponentProps) => {
  const [isPopoverOpen, , closePopover, togglePopover] = useBoolState();
  const { navigateToApp } = useKibana().services.application;
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction({ suppressSuccessToast: true });
  const { bulkExport } = useBulkExport();
  const downloadExportedRules = useDownloadExportedRules();

  const onRuleDeletedCallback = useCallback(() => {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });
  }, [navigateToApp]);

  const actions = useMemo(
    () =>
      rule != null
        ? [
            <EuiContextMenuItem
              key={i18nActions.DUPLICATE_RULE}
              icon="copy"
              disabled={!canDuplicateRuleWithActions || !userHasPermissions}
              data-test-subj="rules-details-duplicate-rule"
              onClick={async () => {
                startTransaction({ name: SINGLE_RULE_ACTIONS.DUPLICATE });
                closePopover();
                const modalDuplicationConfirmationResult =
                  await showBulkDuplicateExceptionsConfirmation();
                if (modalDuplicationConfirmationResult === null) {
                  return;
                }
                const result = await executeBulkAction({
                  type: BulkActionType.duplicate,
                  ids: [rule.id],
                  duplicatePayload: {
                    include_exceptions:
                      modalDuplicationConfirmationResult === DuplicateOptions.withExceptions,
                  },
                });

                const createdRules = result?.attributes.results.created;
                if (createdRules?.length) {
                  goToRuleEditPage(createdRules[0].id, navigateToApp);
                }
              }}
            >
              <EuiToolTip
                position="left"
                content={
                  !canEditRuleWithActions(rule, canDuplicateRuleWithActions)
                    ? i18nActions.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                    : undefined
                }
              >
                <>{i18nActions.DUPLICATE_RULE}</>
              </EuiToolTip>
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={i18nActions.EXPORT_RULE}
              icon="exportAction"
              disabled={!userHasPermissions || rule.immutable}
              data-test-subj="rules-details-export-rule"
              onClick={async () => {
                startTransaction({ name: SINGLE_RULE_ACTIONS.EXPORT });
                closePopover();
                const response = await bulkExport({ ids: [rule.id] });
                if (response) {
                  await downloadExportedRules(response);
                }
              }}
            >
              {i18nActions.EXPORT_RULE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={i18nActions.DELETE_RULE}
              icon="trash"
              disabled={!userHasPermissions}
              data-test-subj="rules-details-delete-rule"
              onClick={async () => {
                startTransaction({ name: SINGLE_RULE_ACTIONS.DELETE });
                closePopover();
                await executeBulkAction({
                  type: BulkActionType.delete,
                  ids: [rule.id],
                });

                onRuleDeletedCallback();
              }}
            >
              {i18nActions.DELETE_RULE}
            </EuiContextMenuItem>,
          ]
        : [],
    [
      bulkExport,
      canDuplicateRuleWithActions,
      closePopover,
      executeBulkAction,
      navigateToApp,
      onRuleDeletedCallback,
      rule,
      showBulkDuplicateExceptionsConfirmation,
      startTransaction,
      userHasPermissions,
      downloadExportedRules,
    ]
  );

  const button = useMemo(
    () => (
      <EuiToolTip position="top" content={i18n.ALL_ACTIONS}>
        <MyEuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.ALL_ACTIONS}
          isDisabled={!userHasPermissions}
          data-test-subj="rules-details-popover-button-icon"
          onClick={togglePopover}
        />
      </EuiToolTip>
    ),
    [togglePopover, userHasPermissions]
  );

  return (
    <>
      <EuiPopover
        anchorPosition="leftCenter"
        button={button}
        closePopover={closePopover}
        id="ruleActionsOverflow"
        isOpen={isPopoverOpen}
        data-test-subj="rules-details-popover"
        ownFocus={true}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiContextMenuPanel data-test-subj="rules-details-menu-panel" items={actions} />
      </EuiPopover>
    </>
  );
};

export const RuleActionsOverflow = React.memo(RuleActionsOverflowComponent);

RuleActionsOverflow.displayName = 'RuleActionsOverflow';
