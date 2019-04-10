/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { useState, useCallback, Fragment } from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { injectI18n, InjectedIntl } from '@kbn/i18n/react';
import euiStyled from '../../../../../../common/eui_styled_components';
import {
  LogEntry,
  LogEntryMessageSegment,
  isConstantSegment,
  isFieldSegment,
  isMessageColumn,
  isTimestampColumn,
} from '../../../utils/log_entry';
import { TextScale } from '../../../../common/log_text_scale';
import { FormattedTime } from '../../formatted_time';
import { LogTextStreamItemDateField } from './item_date_field';
import { LogTextStreamItemMessageField } from './item_message_field';

interface LogTextStreamLogEntryItemViewProps {
  boundingBoxRef?: React.Ref<Element>;
  intl: InjectedIntl;
  logEntry: LogEntry;
  openFlyoutWithItem: (id: string) => void;
  scale: TextScale;
  wrap: boolean;
}

export const LogTextStreamLogEntryItemView = injectI18n(
  ({
    boundingBoxRef,
    intl,
    logEntry,
    openFlyoutWithItem,
    scale,
    wrap,
  }: LogTextStreamLogEntryItemViewProps) => {
    const [isHovered, setIsHovered] = useState(false);

    const setItemIsHovered = useCallback(() => {
      setIsHovered(true);
    }, []);

    const setItemIsNotHovered = useCallback(() => {
      setIsHovered(false);
    }, []);

    const openFlyout = useCallback(() => openFlyoutWithItem(logEntry.gid), [
      openFlyoutWithItem,
      logEntry.gid,
    ]);

    return (
      <LogTextStreamLogEntryItemDiv
        innerRef={
          /* Workaround for missing RefObject support in styled-components */
          boundingBoxRef as any
        }
        onMouseEnter={setItemIsHovered}
        onMouseLeave={setItemIsNotHovered}
      >
        {logEntry.columns.map(column => {
          if (isTimestampColumn(column)) {
            return (
              <LogTextStreamItemDateField
                hasHighlights={false}
                isHovered={isHovered}
                key="timestamp"
                scale={scale}
              >
                <FormattedTime time={column.timestamp} />
              </LogTextStreamItemDateField>
            );
          } else if (isMessageColumn(column)) {
            const viewDetailsLabel = intl.formatMessage({
              id: 'xpack.infra.logEntryItemView.viewDetailsToolTip',
              defaultMessage: 'View Details',
            });
            return (
              <Fragment key="message">
                <LogTextStreamIconDiv isHovered={isHovered}>
                  {isHovered ? (
                    <EuiToolTip content={viewDetailsLabel}>
                      <EuiButtonIcon
                        onClick={openFlyout}
                        iconType="expand"
                        aria-label={viewDetailsLabel}
                      />
                    </EuiToolTip>
                  ) : (
                    <EmptyIcon />
                  )}
                </LogTextStreamIconDiv>
                <LogTextStreamItemMessageField
                  highlights={[]}
                  isHovered={isHovered}
                  isWrapped={wrap}
                  scale={scale}
                >
                  {column.message.map(formatMessageSegment).join('')}
                </LogTextStreamItemMessageField>{' '}
              </Fragment>
            );
          }
        })}
      </LogTextStreamLogEntryItemDiv>
    );
  }
);

interface IconProps {
  isHovered: boolean;
}

const EmptyIcon = euiStyled.div`
  width: 24px;
`;

const LogTextStreamIconDiv = euiStyled<IconProps, 'div'>('div')`
  flex-grow: 0;
  background-color: ${props =>
    props.isHovered
      ? props.theme.darkMode
        ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
        : darken(0.05, props.theme.eui.euiColorHighlight)
      : 'transparent'};
  text-align: center;
  user-select: none;
  font-size: 0.9em;
`;

const LogTextStreamLogEntryItemDiv = euiStyled.div`
  font-family: ${props => props.theme.eui.euiCodeFontFamily};
  font-size: ${props => props.theme.eui.euiFontSize};
  line-height: ${props => props.theme.eui.euiLineHeight};
  color: ${props => props.theme.eui.euiTextColor};
  overflow: hidden;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: stretch;
`;

const formatMessageSegment = (messageSegment: LogEntryMessageSegment): string => {
  if (isFieldSegment(messageSegment)) {
    return messageSegment.value;
  } else if (isConstantSegment(messageSegment)) {
    return messageSegment.constant;
  }

  return 'failed to format message';
};
