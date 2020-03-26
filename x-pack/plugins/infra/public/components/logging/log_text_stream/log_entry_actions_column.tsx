/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { LogEntryColumnContent } from './log_entry_column';
import {
  euiStyled,
  ActionMenu,
  Section,
  SectionTitle,
  SectionLinks,
  SectionLink,
} from '../../../../../observability/public';

interface LogEntryActionsColumnProps {
  isHovered: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onViewDetails: () => void;
}

const MENU_LABEL = i18n.translate('xpack.infra.logEntryItemView.logEntryActionsMenuToolTip', {
  defaultMessage: 'View Details',
});

const LOG_DETAILS_LABEL = i18n.translate('xpack.infra.logs.logEntryActionsDetailsButton', {
  defaultMessage: 'Log details',
});

export const LogEntryActionsColumn: React.FC<LogEntryActionsColumnProps> = ({
  isHovered,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onViewDetails,
}) => {
  const handleClickViewDetails = useCallback(() => {
    onCloseMenu();
    onViewDetails();
  }, [onCloseMenu, onViewDetails]);

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

  return (
    <ActionsColumnContent>
      {isHovered ? (
        <AbsoluteWrapper>
          <ActionMenu closePopover={onCloseMenu} isOpen={isMenuOpen} button={button}>
            <Section>
              <SectionTitle>
                <FormattedMessage
                  id="xpack.infra.logs.logEntryActionsMenuTitle"
                  defaultMessage="Log line details"
                />
              </SectionTitle>
              <SectionLinks>
                <SectionLink label={LOG_DETAILS_LABEL} onClick={handleClickViewDetails} />
              </SectionLinks>
            </Section>
          </ActionMenu>
        </AbsoluteWrapper>
      ) : null}
    </ActionsColumnContent>
  );
};

interface CtaButtonProps {
  onClick: () => void;
}
const CtaButton: React.FC<CtaButtonProps> = ({ children, onClick }) => {
  return (
    <EuiButtonEmpty
      size="s"
      onClick={onClick}
      contentProps={{ style: { justifyContent: 'flex-start', flexGrow: 1, padding: 0 } }}
    >
      {children}
    </EuiButtonEmpty>
  );
};

const ActionsColumnContent = euiStyled(LogEntryColumnContent)`
  overflow: hidden;
  user-select: none;
`;

const ButtonWrapper = euiStyled.div`
  background: ${props => props.theme.eui.euiColorPrimary};
  border-radius: 50%;
`;

// this prevents the button from influencing the line height
const AbsoluteWrapper = euiStyled.div`
  overflow: hidden;
  position: absolute;
`;
