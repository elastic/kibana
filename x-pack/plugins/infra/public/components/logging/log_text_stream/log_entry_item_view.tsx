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
  isFieldColumn,
  isMessageColumn,
  isTimestampColumn,
} from '../../../utils/log_entry';
import { TextScale } from '../../../../common/log_text_scale';
import { LogTextStreamItemDateField } from './item_date_field';
import { LogTextStreamItemFieldField } from './item_field_field';
import { LogTextStreamItemMessageField } from './item_message_field';

interface LogTextStreamLogEntryItemViewProps {
  boundingBoxRef?: React.Ref<Element>;
  isHighlighted: boolean;
  intl: InjectedIntl;
  logEntry: LogEntry;
  openFlyoutWithItem: (id: string) => void;
  scale: TextScale;
  wrap: boolean;
}

export const LogTextStreamLogEntryItemView = injectI18n(
  ({
    boundingBoxRef,
    isHighlighted,
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
        data-test-subj="streamEntry logTextStreamEntry"
        innerRef={
          /* Workaround for missing RefObject support in styled-components */
          boundingBoxRef as any
        }
        onMouseEnter={setItemIsHovered}
        onMouseLeave={setItemIsNotHovered}
      >
        {logEntry.columns.map((column, columnIndex) => {
          if (isTimestampColumn(column)) {
            return (
              <LogTextStreamItemDateField
                dataTestSubj="logColumn timestampLogColumn"
                hasHighlights={false}
                isHighlighted={isHighlighted}
                isHovered={isHovered}
                key={`${columnIndex}`}
                scale={scale}
                time={column.timestamp}
              />
            );
          } else if (isMessageColumn(column)) {
            const viewDetailsLabel = intl.formatMessage({
              id: 'xpack.infra.logEntryItemView.viewDetailsToolTip',
              defaultMessage: 'View Details',
            });
            return (
              <Fragment key={`${columnIndex}`}>
                <LogTextStreamIconDiv isHighlighted={isHighlighted} isHovered={isHovered}>
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
                  dataTestSubj="logColumn messageLogColumn"
                  isHighlighted={isHighlighted}
                  isHovered={isHovered}
                  isWrapped={wrap}
                  scale={scale}
                  segments={column.message}
                />
              </Fragment>
            );
          } else if (isFieldColumn(column)) {
            return (
              <LogTextStreamItemFieldField
                dataTestSubj={`logColumn fieldLogColumn fieldLogColumn:${column.field}`}
                encodedValue={column.value}
                isHighlighted={isHighlighted}
                isHovered={isHovered}
                key={`${columnIndex}`}
                scale={scale}
              />
            );
          }
        })}
      </LogTextStreamLogEntryItemDiv>
    );
  }
);

interface IconProps {
  isHovered: boolean;
  isHighlighted: boolean;
}

const EmptyIcon = euiStyled.div`
  width: 24px;
`;

const LogTextStreamIconDiv = euiStyled<IconProps, 'div'>('div')`
  flex-grow: 0;
  background-color: ${props =>
    props.isHovered || props.isHighlighted
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
