/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { getRuleDetailsUrl } from '../../../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../../app/types';
import { useGetSecuritySolutionLinkProps } from '../../../../../../common/components/links';

import { SUMMARY_PANEL_ACTIONS, OPEN_RULE_DETAILS_PAGE } from '../translation';

export const RULE_PANEL_ACTIONS_CLASS = 'rule-panel-actions-trigger';

export const RulePanelActions = React.memo(
  ({ className, ruleUuid }: { className?: string; ruleUuid: string }) => {
    const [isPopoverOpen, setPopover] = useState(false);
    const { href } = useGetSecuritySolutionLinkProps()({
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleUuid),
    });

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = () => {
      setPopover(false);
    };

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          icon="popout"
          key="ruleActionsOpenRuleDetailsPage"
          data-test-subj="rule-panel-actions-open-rule-details"
          onClick={closePopover}
          href={href}
          target="_blank"
        >
          {OPEN_RULE_DETAILS_PAGE}
        </EuiContextMenuItem>,
      ],
      [href]
    );

    const button = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={SUMMARY_PANEL_ACTIONS}
          className={RULE_PANEL_ACTIONS_CLASS}
          iconType="boxesHorizontal"
          onClick={onButtonClick}
        />
      ),
      [onButtonClick]
    );

    return (
      <div className={className}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          panelClassName="withHoverActions__popover"
        >
          <EuiContextMenuPanel data-test-subj="rule-actions-panel" size="s" items={items} />
        </EuiPopover>
      </div>
    );
  }
);

RulePanelActions.displayName = 'RulePanelActions';
