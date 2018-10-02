/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { px, unit } from '../../../../../style/variables';
// @ts-ignore
import Legend from '../../../../shared/charts/Legend';

const Legends = styled.div`
  display: flex;

  div {
    margin-right: ${px(unit)};
    &:last-child {
      margin-right: 0;
    }
  }
`;

interface Props {
  serviceColors: {
    [key: string]: string;
  };
}

export function ServiceLegends({ serviceColors }: Props) {
  return (
    <Legends>
      {Object.entries(serviceColors).map(([label, color]) => (
        <Legend key={color} color={color} text={label} />
      ))}
    </Legends>
  );
}
