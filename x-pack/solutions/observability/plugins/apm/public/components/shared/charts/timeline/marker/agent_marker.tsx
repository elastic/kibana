/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import { asDuration } from '../../../../../../common/utils/formatters';
import { Legend } from '../legend';
import type { Mark } from '.';

export interface AgentMark extends Mark {
  type: 'agentMark';
}

const NameContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.euiTheme.colors.mediumShade};
  padding-bottom: ${({ theme }) => theme.euiTheme.size.s};
`;

const TimeContainer = styled.div`
  color: ${({ theme }) => theme.euiTheme.colors.mediumShade};
  padding-top: ${({ theme }) => theme.euiTheme.size.s};
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
            <NameContainer>{mark.id}</NameContainer>
            <TimeContainer>{asDuration(mark.offset)}</TimeContainer>
          </div>
        }
      >
        <Legend clickable color={euiTheme.colors.mediumShade} />
      </EuiToolTip>
    </>
  );
}
