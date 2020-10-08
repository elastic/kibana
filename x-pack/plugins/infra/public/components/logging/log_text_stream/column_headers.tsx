/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { transparentize } from 'polished';

import { euiStyled } from '../../../../../observability/public';
import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isFieldLogColumnConfiguration,
  isMessageLogColumnConfiguration,
} from '../../../utils/source_configuration';
import {
  LogEntryColumn,
  LogEntryColumnContent,
  LogEntryColumnWidth,
  LogEntryColumnWidths,
} from './log_entry_column';
import { ASSUMED_SCROLLBAR_WIDTH } from './vertical_scroll_panel';
import { LogPositionState } from '../../../containers/logs/log_position';
import { localizedDate } from '../../../../common/formatters/datetime';

export const LogColumnHeaders: React.FunctionComponent<{
  columnConfigurations: LogColumnConfiguration[];
  columnWidths: LogEntryColumnWidths;
}> = ({ columnConfigurations, columnWidths }) => {
  const { firstVisiblePosition } = useContext(LogPositionState.Context);
  return (
    <LogColumnHeadersWrapper>
      {columnConfigurations.map((columnConfiguration) => {
        if (isTimestampLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogColumnHeader
              key={columnConfiguration.timestampColumn.id}
              columnWidth={columnWidths[columnConfiguration.timestampColumn.id]}
              data-test-subj="logColumnHeader timestampLogColumnHeader"
            >
              {firstVisiblePosition ? localizedDate(firstVisiblePosition.time) : 'Timestamp'}
            </LogColumnHeader>
          );
        } else if (isMessageLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogColumnHeader
              columnWidth={columnWidths[columnConfiguration.messageColumn.id]}
              data-test-subj="logColumnHeader messageLogColumnHeader"
              key={columnConfiguration.messageColumn.id}
            >
              Message
            </LogColumnHeader>
          );
        } else if (isFieldLogColumnConfiguration(columnConfiguration)) {
          return (
            <LogColumnHeader
              columnWidth={columnWidths[columnConfiguration.fieldColumn.id]}
              data-test-subj="logColumnHeader fieldLogColumnHeader"
              key={columnConfiguration.fieldColumn.id}
            >
              {columnConfiguration.fieldColumn.field}
            </LogColumnHeader>
          );
        }
      })}
    </LogColumnHeadersWrapper>
  );
};

export const LogColumnHeader: React.FunctionComponent<{
  columnWidth: LogEntryColumnWidth;
  'data-test-subj'?: string;
}> = ({ children, columnWidth, 'data-test-subj': dataTestSubj }) => (
  <LogColumnHeaderWrapper data-test-subj={dataTestSubj} {...columnWidth}>
    <LogColumnHeaderContent>{children}</LogColumnHeaderContent>
  </LogColumnHeaderWrapper>
);

export const LogColumnHeadersWrapper = euiStyled.div.attrs((props) => ({
  role: props.role ?? 'row',
}))`
  align-items: stretch;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  overflow: hidden;
  padding-right: ${ASSUMED_SCROLLBAR_WIDTH}px;
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  box-shadow: 0 2px 2px -1px ${(props) => transparentize(0.3, props.theme.eui.euiColorLightShade)};
  position: relative;
  z-index: 1;
`;

const LogColumnHeaderWrapper = euiStyled(LogEntryColumn).attrs((props) => ({
  role: props.role ?? 'columnheader',
}))`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 32px;
  overflow: hidden;
`;

const LogColumnHeaderContent = euiStyled(LogEntryColumnContent)`
  color: ${(props) => props.theme.eui.euiTitleColor};
  font-size: ${(props) => props.theme.eui.euiFontSizeS};
  font-weight: ${(props) => props.theme.eui.euiFontWeightSemiBold};
  line-height: ${(props) => props.theme.eui.euiLineHeight};
  text-overflow: clip;
  white-space: pre;
`;
