/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { getOr } from 'lodash/fp';

const StyledDiv = styled.div<{ targetClassNames: string[] }>`
  width: 100%;
  display: flex;
  flex-grow: 1;

  > * {
    max-width: 100%;
  }

  ${({ targetClassNames }) =>
    css`
      ${targetClassNames.map((cn) => `.${cn}`).join(', ')} {
        pointer-events: none;
        opacity: 0;
        transition: opacity ${(props) => getOr(250, 'theme.eui.euiAnimSpeedNormal', props)} ease;
      }

      ${targetClassNames.map((cn) => `&:hover .${cn}`).join(', ')} {
        pointer-events: auto;
        opacity: 1;
      }
    `}
`;

interface HoverVisibilityContainerProps {
  show?: boolean;
  children: React.ReactNode;
  targetClassNames: string[];
}

export const HoverVisibilityContainer = React.memo<HoverVisibilityContainerProps>(
  ({ show = true, targetClassNames, children }) => {
    if (!show) return <>{children}</>;

    return (
      <StyledDiv data-test-subj="hoverVisibilityContainer" targetClassNames={targetClassNames}>
        {children}
      </StyledDiv>
    );
  }
);

HoverVisibilityContainer.displayName = 'HoverVisibilityContainer';
