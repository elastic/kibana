/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiToolTip } from '@elastic/eui';
import Legend from '../Legend';
import { colors, units, px } from '../../../../style/variables';
import styled from 'styled-components';
import { asTime } from '../../../../utils/formatters';

const NameContainer = styled.div`
  border-bottom: 1px solid ${colors.gray3};
  padding-bottom: ${px(units.half)};
`;

const TimeContainer = styled.div`
  color: ${colors.gray3};
  padding-top: ${px(units.half)};
`;

export default function AgentMarker({ agentMark, x }) {
  const legendWidth = 11;
  return (
    <div
      style={{
        position: 'absolute',
        left: px(x - legendWidth / 2),
        bottom: 0
      }}
    >
      <EuiToolTip
        id={agentMark.name}
        position="top"
        content={
          <div>
            <NameContainer>{agentMark.name}</NameContainer>
            <TimeContainer>{asTime(agentMark.us)}</TimeContainer>
          </div>
        }
      >
        <Legend clickable color={colors.gray3} />
      </EuiToolTip>
    </div>
  );
}

AgentMarker.propTypes = {
  agentMark: PropTypes.object.isRequired,
  x: PropTypes.number.isRequired
};
