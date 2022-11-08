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
import { noop } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { BulkAction } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useKibana } from '../../../../common/lib/kibana';
import { canEditRuleWithActions } from '../../../../common/utils/privileges';
import type { Rule } from '../../../containers/detection_engine/rules';
import {
  executeRulesBulkAction,
  goToRuleEditPage,
  bulkExportRules,
} from '../../../pages/detection_engine/rules/all/actions';
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
}

/**
 * Overflow Actions for a Rule
 */
const RuleActionsOverflowComponent = ({
  rule,
  userHasPermissions,
  canDuplicateRuleWithActions,
}: RuleActionsOverflowComponentProps) => {
  const [isPopoverOpen, , closePopover, togglePopover] = useBoolState();
  const { navigateToApp } = useKibana().services.application;
  const toasts = useAppToasts();
  const { startTransaction } = useStartTransaction();

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
                const result = await executeRulesBulkAction({
                  action: BulkAction.duplicate,
                  onSuccess: noop,
                  search: { ids: [rule.id] },
                  toasts,
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
                await bulkExportRules({
                  action: BulkAction.export,
                  search: { ids: [rule.id] },
                  toasts,
                });
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
                await executeRulesBulkAction({
                  action: BulkAction.delete,
                  onSuccess: onRuleDeletedCallback,
                  search: { ids: [rule.id] },
                  toasts,
                });
              }}
            >
              {i18nActions.DELETE_RULE}
            </EuiContextMenuItem>,
          ]
        : [],
    [
      canDuplicateRuleWithActions,
      closePopover,
      navigateToApp,
      onRuleDeletedCallback,
      rule,
      startTransaction,
      toasts,
      userHasPermissions,
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
