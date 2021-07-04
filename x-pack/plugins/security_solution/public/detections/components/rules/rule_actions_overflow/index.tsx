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

import { noop } from 'lodash/fp';
import { useHistory } from 'react-router-dom';
import { Rule } from '../../../containers/detection_engine/rules';
import * as i18n from './translations';
import * as i18nActions from '../../../pages/detection_engine/rules/translations';
import { useStateToaster } from '../../../../common/components/toasters';
import {
  deleteRulesAction,
  duplicateRulesAction,
  editRuleAction,
  exportRulesAction,
} from '../../../pages/detection_engine/rules/all/actions';
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { getToolTipContent } from '../../../../common/utils/privileges';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useKibana } from '../../../../common/lib/kibana';

const MyEuiButtonIcon = styled(EuiButtonIcon)`
  &.euiButtonIcon {
    svg {
      transform: rotate(90deg);
    }
    border: 1px solid  ${({ theme }) => theme.euiColorPrimary};
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
  const history = useHistory();
  const { navigateToApp } = useKibana().services.application;
  const [, dispatchToaster] = useStateToaster();

  const onRuleDeletedCallback = useCallback(() => {
    history.push(getRulesUrl());
  }, [history]);

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
                closePopover();
                const createdRules = await duplicateRulesAction(
                  [rule],
                  [rule.id],
                  noop,
                  dispatchToaster
                );
                if (createdRules?.length) {
                  editRuleAction(createdRules[0].id, navigateToApp);
                }
              }}
            >
              <EuiToolTip
                position="left"
                content={getToolTipContent(rule, true, canDuplicateRuleWithActions)}
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
                closePopover();
                await exportRulesAction([rule.rule_id], noop, dispatchToaster);
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
                closePopover();
                await deleteRulesAction([rule.id], noop, dispatchToaster, onRuleDeletedCallback);
              }}
            >
              {i18nActions.DELETE_RULE}
            </EuiContextMenuItem>,
          ]
        : [],
    [
      canDuplicateRuleWithActions,
      closePopover,
      dispatchToaster,
      navigateToApp,
      onRuleDeletedCallback,
      rule,
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
