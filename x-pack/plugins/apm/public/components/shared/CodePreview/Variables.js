/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  colors,
  borderRadius,
  px,
  units,
  fontFamily,
  unit
} from '../../../style/variables';

import { Ellipsis } from '../../shared/Icons';
import { PropertiesTable } from '../../shared/PropertiesTable';

const VariablesContainer = styled.div`
  background: ${colors.white};
  border-top: 1px solid ${colors.gray4};
  border-radius: 0 0 ${borderRadius} ${borderRadius};
  padding: ${px(units.half)} ${px(unit)};
  font-family: ${fontFamily};
`;

const VariablesToggle = styled.a`
  display: block;
  cursor: pointer;
  user-select: none;
`;

const VariablesTableContainer = styled.div`
  padding: ${px(units.plus)} ${px(unit)} 0;
`;

export function Variables({ vars, visible, onClick }) {
  return (
    <VariablesContainer>
      <VariablesToggle onClick={onClick}>
        <Ellipsis horizontal={visible} style={{ marginRight: units.half }} />{' '}
        Local variables
      </VariablesToggle>
      {visible && (
        <VariablesTableContainer>
          <PropertiesTable propData={vars} propKey={'custom'} />
        </VariablesTableContainer>
      )}
    </VariablesContainer>
  );
}
