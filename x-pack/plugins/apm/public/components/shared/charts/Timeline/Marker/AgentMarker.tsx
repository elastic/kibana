/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import { useTheme } from '../../../../../hooks/useTheme';
import { px, units } from '../../../../../style/variables';
import { asDuration } from '../../../../../utils/formatters';
import { Legend } from '../../Legend';
import { AgentMark } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_agent_marks';

const NameContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.eui.euiColorMediumShade};
  padding-bottom: ${px(units.half)};
`;

const TimeContainer = styled.div`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
  padding-top: ${px(units.half)};
`;

interface Props {
  mark: AgentMark;
}

export const AgentMarker: React.FC<Props> = ({ mark }) => {
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
};
