/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { px } from '../../../../../style/variables';
import { AgentMarker } from './AgentMarker';
import { ErrorMarker } from './ErrorMarker';
import { AgentMark } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_agent_marks';
import { ErrorMark } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_error_marks';

interface Props {
  mark: ErrorMark | AgentMark;
  x: number;
}

const MarkerContainer = styled.div`
  position: absolute;
  bottom: 0;
`;

export const Marker: React.FC<Props> = ({ mark, x }) => {
  const legendWidth = 11;
  return (
    <MarkerContainer style={{ left: px(x - legendWidth / 2) }}>
      {mark.type === 'errorMark' ? (
        <ErrorMarker mark={mark} />
      ) : (
        <AgentMarker mark={mark} />
      )}
    </MarkerContainer>
  );
};
