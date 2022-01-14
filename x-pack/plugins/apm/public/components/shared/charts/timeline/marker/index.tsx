/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { AgentMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { ErrorMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';
import { AgentMarker } from './agent_marker';
import { ErrorMarker } from './error_marker';

interface Props {
  mark: ErrorMark | AgentMark;
  x: number;
}

const MarkerContainer = euiStyled.div`
  position: absolute;
  bottom: 0;
`;

export function Marker({ mark, x }: Props) {
  const legendWidth = 11;
  return (
    <MarkerContainer style={{ left: x - legendWidth / 2 }}>
      {mark.type === 'errorMark' ? (
        <ErrorMarker mark={mark} />
      ) : (
        <AgentMarker mark={mark} />
      )}
    </MarkerContainer>
  );
}
