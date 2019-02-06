/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import * as React from 'react';
import styled from 'styled-components';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { LogEntry } from '../../../../common/log_entry';
import { SearchResult } from '../../../../common/log_search_result';
import { TextScale } from '../../../../common/log_text_scale';
import { formatTime } from '../../../../common/time';
import { LogTextStreamItemDateField } from './item_date_field';
import { LogTextStreamItemMessageField } from './item_message_field';

interface LogTextStreamLogEntryItemViewProps {
  boundingBoxRef?: React.Ref<Element>;
  logEntry: LogEntry;
  searchResult?: SearchResult;
  scale: TextScale;
  wrap: boolean;
  openFlyoutWithItem: (id: string) => void;
  intl: InjectedIntl;
}

interface LogTextStreamLogEntryItemViewState {
  isHovered: boolean;
}

export const LogTextStreamLogEntryItemView = injectI18n(
  class extends React.PureComponent<
    LogTextStreamLogEntryItemViewProps,
    LogTextStreamLogEntryItemViewState
  > {
    public readonly state = {
      isHovered: false,
    };

    public handleMouseEnter: React.MouseEventHandler<HTMLDivElement> = () => {
      this.setState({
        isHovered: true,
      });
    };

    public handleMouseLeave: React.MouseEventHandler<HTMLDivElement> = () => {
      this.setState({
        isHovered: false,
      });
    };

    public handleClick: React.MouseEventHandler<HTMLButtonElement> = () => {
      this.props.openFlyoutWithItem(this.props.logEntry.gid);
    };

    public render() {
      const { intl, boundingBoxRef, logEntry, scale, searchResult, wrap } = this.props;
      const { isHovered } = this.state;
      const viewDetailsLabel = intl.formatMessage({
        id: 'xpack.infra.logEntryItemView.viewDetailsToolTip',
        defaultMessage: 'View Details',
      });

      return (
        <LogTextStreamLogEntryItemDiv
          innerRef={
            /* Workaround for missing RefObject support in styled-components */
            boundingBoxRef as any
          }
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <LogTextStreamItemDateField
            hasHighlights={!!searchResult}
            isHovered={isHovered}
            scale={scale}
          >
            {formatTime(logEntry.fields.time)}
          </LogTextStreamItemDateField>
          <LogTextStreamIconDiv isHovered={isHovered}>
            {isHovered ? (
              <EuiToolTip content={viewDetailsLabel}>
                <EuiButtonIcon
                  onClick={this.handleClick}
                  iconType="expand"
                  aria-label={viewDetailsLabel}
                />
              </EuiToolTip>
            ) : (
              <EmptyIcon />
            )}
          </LogTextStreamIconDiv>
          <LogTextStreamItemMessageField
            highlights={searchResult ? searchResult.matches.message || [] : []}
            isHovered={isHovered}
            isWrapped={wrap}
            scale={scale}
          >
            {logEntry.fields.message}
          </LogTextStreamItemMessageField>
        </LogTextStreamLogEntryItemDiv>
      );
    }
  }
);

interface IconProps {
  isHovered: boolean;
}

const EmptyIcon = styled.div`
  width: 24px;
`;

const LogTextStreamIconDiv = styled<IconProps, 'div'>('div')`
  flex-grow: 0;
  background-color: ${props =>
    props.isHovered
      ? props.theme.darkMode
        ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
        : darken(0.05, props.theme.eui.euiColorHighlight)
      : 'transparent'};
  text-align: center;
  user-select: none;
`;

const LogTextStreamLogEntryItemDiv = styled.div`
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
