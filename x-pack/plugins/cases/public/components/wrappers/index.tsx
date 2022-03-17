/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';

const gutterTimeline = '70px'; // seems to be a timeline reference from the original file
export const ContentWrapper = styled.div`
  ${({ theme }) =>
    `
      padding: 0 0 ${gutterTimeline} 0;
    `};
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;
