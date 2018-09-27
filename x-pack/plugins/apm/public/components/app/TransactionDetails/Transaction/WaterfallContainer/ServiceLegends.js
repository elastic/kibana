/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Legend from '../../../../shared/charts/Legend';
import { unit, px } from '../../../../../style/variables';

const Legends = styled.div`
  display: flex;

  div {
    margin-right: ${px(unit)};
    &:last-child {
      margin-right: 0;
    }
  }
`;

export default function ServiceLegends({ serviceColors }) {
  return (
    <Legends>
      {Object.entries(serviceColors).map(([label, color]) => (
        <Legend key={color} color={color} text={label} />
      ))}
    </Legends>
  );
}

ServiceLegends.propTypes = {
  serviceColors: PropTypes.object.isRequired
};
