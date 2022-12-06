/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import type { CasesPermissions } from '@kbn/cases-plugin/common';
import React, { useCallback, useMemo, useState } from 'react';
import type { CasesPanelProps } from '.';
import {
  ADD_TO_EXISTING_CASE_BUTTON,
  ADD_TO_NEW_CASE_BUTTON,
  SUMMARY_PANEL_ACTIONS,
} from '../translation';

export const CASES_PANEL_ACTIONS_CLASS = 'cases-panel-actions-trigger';

export interface CasesPanelActionsProps extends CasesPanelProps {
  addToNewCase: () => void;
  addToExistingCase: () => void;
  className?: string;
  userCasesPermissions: CasesPermissions;
}

export const CasesPanelActions = React.memo(
  ({
    addToNewCase,
    addToExistingCase,
    className,
    userCasesPermissions,
  }: CasesPanelActionsProps) => {
    const [isPopoverOpen, setPopover] = useState(false);

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = () => {
      setPopover(false);
    };

    const items = useMemo(() => {
      const options = [];

      if (userCasesPermissions.create) {
        options.push(
          <EuiContextMenuItem
            key="casesActionsAddToNewCase"
            onClick={addToNewCase}
            data-test-subj="cases-panel-actions-add-to-new-case"
          >
            {ADD_TO_NEW_CASE_BUTTON}
          </EuiContextMenuItem>
        );
      }

      if (userCasesPermissions.update) {
        options.push(
          <EuiContextMenuItem
            key="caseActionsAddToExistingCase"
            data-test-subj="cases-panel-actions-add-to-existing-case"
            onClick={addToExistingCase}
            target="_blank"
          >
            {ADD_TO_EXISTING_CASE_BUTTON}
          </EuiContextMenuItem>
        );
      }
      return options;
    }, [addToExistingCase, addToNewCase, userCasesPermissions.create, userCasesPermissions.update]);

    const button = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={SUMMARY_PANEL_ACTIONS}
          className={CASES_PANEL_ACTIONS_CLASS}
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
          <EuiContextMenuPanel data-test-subj="cases-actions-panel" size="s" items={items} />
        </EuiPopover>
      </div>
    );
  }
);

CasesPanelActions.displayName = 'CasesPanelActions';
