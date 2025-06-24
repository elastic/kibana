/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { css, keyframes } from '@emotion/react';
import { euiCanAnimate } from '@elastic/eui';

const fadeIn = keyframes`
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
`;

const fadeInStyle = css`
  ${euiCanAnimate} {
    animation: ${fadeIn} 0.6s ease-in forwards;
  }
`;

interface WithFadeInProps {
  children: ReactNode;
}

export const WithFadeIn: React.FC<WithFadeInProps> = ({ children }) => {
  return <div css={fadeInStyle}>{children}</div>;
};
