/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { asDuration } from '../../../../../../common/utils/formatters';
import { useTheme } from '../../../../../hooks/use_theme';
import { AgentMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { Legend } from '../legend';

const NameContainer = euiStyled.div`
  border-bottom: 1px solid ${({ theme }) => theme.eui.euiColorMediumShade};
  padding-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const TimeContainer = euiStyled.div`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
  padding-top: ${({ theme }) => theme.eui.paddingSizes.s};
`;

interface Props {
  mark: AgentMark;
}

export function AgentMarker({ mark }: Props) {
  const theme = useTheme();

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
        <Legend clickable color={theme.eui.euiColorMediumShade} />
      </EuiToolTip>
    </>
  );
}
