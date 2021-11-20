/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { Ping } from '../../../../../common/runtime_types/ping';

const StyledSpan = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
`;

interface Props {
  errorType: string;
  ping: Ping;
}

export const PingErrorCol = ({ errorType, ping }: Props) => {
  if (!errorType) {
    return <>--</>;
  }
  return (
    <StyledSpan>
      {errorType}:{ping.error?.message}
    </StyledSpan>
  );
};
