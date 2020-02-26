/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonIcon, EuiPopover } from '@elastic/eui';

import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';
import { euiStyled } from '../../../../../observability/public';

interface LogEntryActionsColumnProps {
  isHighlighted: boolean;
  isHovered: boolean;
}

export const LogEntryActionsColumn: React.FC<LogEntryActionsColumnProps> = ({
  isHighlighted,
  isHovered,
}) => {
  const [isOpen, setOpen] = useState<boolean>(false);
  const doOpen = useCallback(() => setOpen(true), [setOpen]);
  const doClose = useCallback(() => setOpen(false), [setOpen]);

  const button = (
    <ButtonWrapper>
      <EuiButtonIcon color="ghost" iconType="boxesHorizontal" onClick={doOpen} />
    </ButtonWrapper>
  );

  return (
    <LogEntryActionsColumnWrapper isHighlighted={isHighlighted} isHovered={isHovered}>
      {isHovered ? (
        <AbsoluteWrapper>
          <EuiPopover button={button} isOpen={isOpen} closePopover={doClose}>
            Not implemented
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
