/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { fontSizes, px, units } from '../../style/variables';

export const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${px(units.plus)};

  h1 {
    font-size: ${fontSizes.xxlarge};
  }
`;
