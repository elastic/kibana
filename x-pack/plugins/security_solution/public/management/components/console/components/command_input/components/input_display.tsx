/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const InputDisplayContainer = styled.div`
  overflow: hidden !important;

  .inputDisplay {
    & > * {
      flex-direction: row;
      align-items: center;
    }
  }

  // Styles for when the console's input has focus are defined in '<CommandInput>' component
  .cursor {
    display: inline-block;
    width: 1px;
    height: ${({ theme: { eui } }) => eui.euiLineHeight}em;
    background-color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  }
`;

export interface InputDisplayProps {
  leftOfCursor: ReactNode;
  rightOfCursor: ReactNode;
}

export const InputDisplay = memo<InputDisplayProps>(({ leftOfCursor, rightOfCursor }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  // FIXME:PT need to adjust left/right scroll if cursor is close to the left/right edge

  return (
    <InputDisplayContainer>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        gutterSize="none"
        className="inputDisplay"
      >
        <EuiFlexItem
          grow={false}
          data-test-subj={getTestId('cmdInput-leftOfCursor')}
          className="noMinWidth"
        >
          {leftOfCursor}
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="noMinWidth">
          <span className="cursor essentialAnimation" />
        </EuiFlexItem>
        <EuiFlexItem className="noMinWidth" data-test-subj={getTestId('cmdInput-rightOfCursor')}>
          {rightOfCursor}
        </EuiFlexItem>
      </EuiFlexGroup>
    </InputDisplayContainer>
  );
});
InputDisplay.displayName = 'InputDisplay';
