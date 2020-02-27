/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiPopover, EuiButtonEmpty, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';
import { euiStyled } from '../../../../../observability/public';

interface LogEntryActionsColumnProps {
  isHighlighted: boolean;
  isHovered: boolean;
  onViewDetails: () => void;
  onViewInContext: () => void;
  hasMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

export const LogEntryActionsColumn: React.FC<LogEntryActionsColumnProps> = ({
  isHighlighted,
  isHovered,
  onViewDetails,
  onViewInContext,
  hasMenuOpen,
  openMenu,
  closeMenu,
}) => {
  const handleClickViewDetails = useCallback(() => {
    closeMenu();
    onViewDetails();
  }, [closeMenu, onViewDetails]);

  const handleClickViewInContext = useCallback(() => {
    closeMenu();
    onViewInContext();
  }, [closeMenu, onViewInContext]);

  const button = (
    <ButtonWrapper>
      <EuiButtonIcon color="ghost" iconType="boxesHorizontal" onClick={openMenu} />
    </ButtonWrapper>
  );

  return (
    <LogEntryActionsColumnWrapper isHighlighted={isHighlighted} isHovered={isHovered}>
      {isHovered ? (
        <AbsoluteWrapper>
          <EuiPopover button={button} isOpen={hasMenuOpen} closePopover={closeMenu}>
            <EuiTitle size="xxs">
              <h2>
                <FormattedMessage
                  id="xpack.infra.logs.logEntryActionsMenuTitle"
                  defaultMessage="Log line details"
                />
              </h2>
            </EuiTitle>

            <div>
              <EuiButtonEmpty flush="left" size="s" onClick={handleClickViewDetails}>
                <FormattedMessage
                  id="xpack.infra.logs.logEntryActionsDetailsButton"
                  defaultMessage="Log details"
                />
              </EuiButtonEmpty>
            </div>
            <div>
              <EuiButtonEmpty flush="left" size="s" onClick={handleClickViewInContext}>
                <FormattedMessage
                  id="xpack.infra.logs.logEntryActionsLineInContextButton"
                  defaultMessage="Log line in context"
                />
              </EuiButtonEmpty>
            </div>
          </EuiPopover>
        </AbsoluteWrapper>
      ) : null}
    </LogEntryActionsColumnWrapper>
  );
};

type LogEntryActionsColumnWrapperProps = Pick<
  LogEntryActionsColumnProps,
  'isHighlighted' | 'isHovered'
>;

const LogEntryActionsColumnWrapper = euiStyled(LogEntryColumnContent)<
  LogEntryActionsColumnWrapperProps
>`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  user-select: none;
  position: relative;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
`;
const AbsoluteWrapper = euiStyled.div`
  position: absolute;
  top: 5px;
  right: 5px;
`;

const ButtonWrapper = euiStyled.div`
  background: ${props => props.theme.eui.euiColorPrimary};
  border-radius: 50%;
`;
