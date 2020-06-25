/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { LogEntryColumnContent } from './log_entry_column';
import { euiStyled } from '../../../../../observability/public';
import { HorizontalBoxButtonWithPopoverMenu } from '../../horizontal_box_button_with_popover';

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

  const items = [
    {
      key: 'log_details',
      onClick: handleClickViewDetails,
      label: LOG_DETAILS_LABEL,
    },
  ];

  if (onViewLogInContext !== undefined) {
    items.push({
      key: 'view_in_context',
      onClick: handleClickViewInContext,
      label: LOG_VIEW_IN_CONTEXT_LABEL,
    });
  }

  return (
    <ActionsColumnContent>
      {isHovered || isMenuOpen ? (
        <AbsoluteWrapper>
          <HorizontalBoxButtonWithPopoverMenu
            onMenuOpen={onOpenMenu}
            onMenuClose={onCloseMenu}
            ariaLabel={MENU_LABEL}
            menuItems={items}
          />
        </AbsoluteWrapper>
      ) : null}
    </ActionsColumnContent>
  );
};

const ActionsColumnContent = euiStyled(LogEntryColumnContent)`
  overflow: hidden;
  user-select: none;
`;

// this prevents the button from influencing the line height
const AbsoluteWrapper = euiStyled.div`
  position: absolute;
`;
