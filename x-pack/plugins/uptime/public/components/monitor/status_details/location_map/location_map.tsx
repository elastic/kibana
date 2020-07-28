/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EmbeddedMap, LocationPoint } from './embeddables/embedded_map';

// These height/width values are used to make sure map is in center of panel
// And to make sure, it doesn't take too much space
const MapPanel = styled.div`
  height: 240px;
  width: 520px;
  margin-right: 65px;
  @media (max-width: 574px) {
    height: 250px;
    width: 100%;
  }
`;

interface Props {
  upPoints: LocationPoint[];
  downPoints: LocationPoint[];
}

export const LocationMap = ({ upPoints, downPoints }: Props) => {
  return (
    <MapPanel>
      <EmbeddedMap upPoints={upPoints} downPoints={downPoints} />
    </MapPanel>
  );
};
