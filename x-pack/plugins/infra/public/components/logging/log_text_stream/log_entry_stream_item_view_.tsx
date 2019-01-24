/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import styled from 'styled-components';

import { LogEntry } from '../../../../common/log_entry';

interface LogEntryStreamItemViewProps {
  boundingBoxRef?: React.Ref<{}>;
  item: LogEntry;
}

export class LogEntryStreamItemView extends React.PureComponent<LogEntryStreamItemViewProps, {}> {
  public render() {
    const { boundingBoxRef, item } = this.props;

    return (
      // @ts-ignore: silence error until styled-components supports React.RefObject<T>
      <LogEntryDiv innerRef={boundingBoxRef}>{JSON.stringify(item)}</LogEntryDiv>
    );
  }
}

const LogEntryDiv = styled.div`
  border-top: 1px solid red;
  border-bottom: 1px solid green;
`;
