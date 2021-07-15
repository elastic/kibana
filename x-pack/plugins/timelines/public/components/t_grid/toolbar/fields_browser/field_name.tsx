/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHighlight, EuiText } from '@elastic/eui';
import styled from 'styled-components';

/**
 * The name of a field
 */
export const FieldNameContainer = styled.span`
  border-radius: 4px;
  display: flex;
  padding: 0 4px 0 8px;
  position: relative;

  &::before {
    background-image: linear-gradient(
        135deg,
        ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
        transparent 25%
      ),
      linear-gradient(-135deg, ${({ theme }) => theme.eui.euiColorMediumShade} 25%, transparent 25%),
      linear-gradient(135deg, transparent 75%, ${({ theme }) => theme.eui.euiColorMediumShade} 75%),
      linear-gradient(-135deg, transparent 75%, ${({ theme }) => theme.eui.euiColorMediumShade} 75%);
    background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
    background-size: 2px 2px;
    bottom: 2px;
    content: '';
    display: block;
    left: 2px;
    position: absolute;
    top: 2px;
    width: 4px;
  }

  &:hover,
  &:focus {
    transition: background-color 0.7s ease;
    background-color: #000;
    color: #fff;

    &::before {
      background-image: linear-gradient(135deg, #fff 25%, transparent 25%),
        linear-gradient(
          -135deg,
          ${({ theme }) => theme.eui.euiColorLightestShade} 25%,
          transparent 25%
        ),
        linear-gradient(
          135deg,
          transparent 75%,
          ${({ theme }) => theme.eui.euiColorLightestShade} 75%
        ),
        linear-gradient(
          -135deg,
          transparent 75%,
          ${({ theme }) => theme.eui.euiColorLightestShade} 75%
        );
    }
  }
`;

FieldNameContainer.displayName = 'FieldNameContainer';

/** Renders a field name in it's non-dragging state */
export const FieldName = React.memo<{
  fieldId: string;
  highlight?: string;
}>(({ fieldId, highlight = '' }) => {
  return (
    <EuiText size="xs">
      <FieldNameContainer>
        <EuiHighlight data-test-subj={`field-name-${fieldId}`} search={highlight}>
          {fieldId}
        </EuiHighlight>
      </FieldNameContainer>
    </EuiText>
  );
});

FieldName.displayName = 'FieldName';
