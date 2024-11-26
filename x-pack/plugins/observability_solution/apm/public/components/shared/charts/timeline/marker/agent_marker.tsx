/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiThemeComputed, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { asDuration } from '../../../../../../common/utils/formatters';
import { AgentMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { Legend } from '../legend';

const NameContainer = euiStyled.div<{ euiTheme: EuiThemeComputed }>`
  border-bottom: 1px solid ${({ euiTheme }) => euiTheme.colors.mediumShade};
  padding-bottom: ${({ euiTheme }) => euiTheme.size.s};
`;

const TimeContainer = euiStyled.div<{ euiTheme: EuiThemeComputed }>`
  color: ${({ euiTheme }) => euiTheme.colors.mediumShade};
  padding-top: ${({ euiTheme }) => euiTheme.size.s};
`;

interface Props {
  mark: AgentMark;
}

export function AgentMarker({ mark }: Props) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiToolTip
        id={mark.id}
        position="top"
        content={
          <div>
            <NameContainer euiTheme={euiTheme}>{mark.id}</NameContainer>
            <TimeContainer euiTheme={euiTheme}>{asDuration(mark.offset)}</TimeContainer>
          </div>
        }
      >
        <Legend clickable color={euiTheme.colors.mediumShade} />
      </EuiToolTip>
    </>
  );
}
