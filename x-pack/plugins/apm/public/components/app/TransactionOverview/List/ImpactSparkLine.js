/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { units, borderRadius, px, colors } from '../../../../style/variables';

const ImpactBarBackground = styled.div`
  height: ${px(units.minus)};
  border-radius: ${borderRadius};
  background: ${colors.gray4};
  width: 100%;
`;

const ImpactBar = styled.div`
  height: ${px(units.minus)};
  background: ${colors.blue2};
  border-radius: ${borderRadius};
`;

function ImpactSparkline({ impact }) {
  if (!impact && impact !== 0) {
    return <div>N/A</div>;
  }

  return (
    <ImpactBarBackground>
      <ImpactBar style={{ width: `${impact}%` }} />
    </ImpactBarBackground>
  );
}

export default ImpactSparkline;
