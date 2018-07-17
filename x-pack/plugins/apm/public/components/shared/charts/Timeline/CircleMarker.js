/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiToolTip } from '@elastic/eui';
import Legend from '../Legend';
import { colors } from '../../../../style/variables';

export default function CircleMarker({ agentMark, x }) {
  const legendWidth = 11;
  return (
    <div style={{ transform: `translateX(${x - legendWidth / 2}px)` }}>
      <EuiToolTip
        content={
          <div>
            <p>{agentMark.name}</p>
            <p>{agentMark.label}</p>
          </div>
        }
      >
        <Legend clickable color={colors.gray3} />
      </EuiToolTip>
    </div>
  );
}

CircleMarker.propTypes = {
  agentMark: PropTypes.object.isRequired,
  x: PropTypes.number.isRequired
};
