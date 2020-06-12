/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LogEntryColumnContent } from './log_entry_column';
import { euiStyled } from '../../../../../observability/public';

interface LogEntryActionsColumnProps {
  isHovered: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onViewDetails?: () => void;
  onViewLogInContext?: () => void;
}

const MENU_LABEL = i18n.translate('xpack.infra.logEntryItemView.logEntryActionsMenuToolTip', {
  defaultMessage: 'View actions for line',
});

const LOG_DETAILS_LABEL = i18n.translate('xpack.infra.logs.logEntryActionsDetailsButton', {
  defaultMessage: 'View details',
});

const LOG_VIEW_IN_CONTEXT_LABEL = i18n.translate(
  'xpack.infra.lobs.logEntryActionsViewInContextButton',
  {
    defaultMessage: 'View in context',
  }
);

export const LogEntryActionsColumn: React.FC<LogEntryActionsColumnProps> = ({
  isHovered,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onViewDetails,
  onViewLogInContext,
}) => {
  const handleClickViewDetails = useCallback(() => {
    onCloseMenu();

    // Function might be `undefined` and the linter doesn't like that.
    // eslint-disable-next-line no-unused-expressions
    onViewDetails?.();
  }, [onCloseMenu, onViewDetails]);

  const handleClickViewInContext = useCallback(() => {
    onCloseMenu();

    // Function might be `undefined` and the linter doesn't like that.
    // eslint-disable-next-line no-unused-expressions
    onViewLogInContext?.();
  }, [onCloseMenu, onViewLogInContext]);

  const button = (
    <ButtonWrapper>
      <EuiButtonIcon
        aria-label={MENU_LABEL}
        color="ghost"
        iconType="boxesHorizontal"
        onClick={onOpenMenu}
      />
    </ButtonWrapper>
  );

  const items = [
    <EuiContextMenuItem key="log_details" onClick={handleClickViewDetails}>
      {LOG_DETAILS_LABEL}
    </EuiContextMenuItem>,
  ];

  if (onViewLogInContext !== undefined) {
    items.push(
      <EuiContextMenuItem key="view_in_context" onClick={handleClickViewInContext}>
        {LOG_VIEW_IN_CONTEXT_LABEL}
      </EuiContextMenuItem>
    );
  }

  return (
    <ActionsColumnContent>
      {isHovered || isMenuOpen ? (
        <AbsoluteWrapper>
          <EuiPopover
            closePopover={onCloseMenu}
            isOpen={isMenuOpen}
            button={button}
            ownFocus={true}
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </AbsoluteWrapper>
      ) : null}
    </ActionsColumnContent>
  );
};

const ActionsColumnContent = euiStyled(LogEntryColumnContent)`
  overflow: hidden;
  user-select: none;
`;

const ButtonWrapper = euiStyled.div`
  background: ${(props) => props.theme.eui.euiColorPrimary};
  border-radius: 50%;
  padding: 4px;
  transform: translateY(-6px);
`;

// this prevents the button from influencing the line height
const AbsoluteWrapper = euiStyled.div`
  position: absolute;
`;
