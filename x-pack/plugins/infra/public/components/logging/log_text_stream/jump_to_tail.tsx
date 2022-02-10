/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as React from 'react';

import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';

interface LogTextStreamJumpToTailProps {
  onClickJump?: () => void;
  width: number;
}

export class LogTextStreamJumpToTail extends React.PureComponent<LogTextStreamJumpToTailProps> {
  public render() {
    const { onClickJump, width } = this.props;
    return (
      <JumpToTailWrapper width={width}>
        <MessageWrapper>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.infra.logs.streamingNewEntriesText"
              defaultMessage="Streaming new entries"
            />
          </EuiText>
        </MessageWrapper>
        <EuiButtonEmpty size="xs" onClick={onClickJump} iconType="arrowDown">
          <FormattedMessage
            id="xpack.infra.logs.jumpToTailText"
            defaultMessage="Jump to most recent entries"
          />
        </EuiButtonEmpty>
      </JumpToTailWrapper>
    );
  }
}

const JumpToTailWrapper = euiStyled.div<{ width: number }>`
  align-items: center;
  display: flex;
  min-height: ${(props) => props.theme.eui.euiSizeXXL};
  width: ${(props) => props.width}px;
  position: fixed;
  bottom: 0;
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
`;

const MessageWrapper = euiStyled.div`
  padding: 8px 16px;
`;
