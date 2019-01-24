/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import styled from 'styled-components';

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
}

interface LogTextStreamLogEntryItemViewState {
  isHovered: boolean;
}

export class LogTextStreamLogEntryItemView extends React.PureComponent<
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

  public render() {
    const { boundingBoxRef, logEntry, scale, searchResult, wrap } = this.props;
    const { isHovered } = this.state;

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
