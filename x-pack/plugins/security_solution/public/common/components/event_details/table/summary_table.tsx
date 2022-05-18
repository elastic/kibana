/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled, { AnyStyledComponent } from 'styled-components';
import { EuiInMemoryTable } from '@elastic/eui';

export const SummaryTable = styled(EuiInMemoryTable as unknown as AnyStyledComponent)`
  .timelines__hoverActionButton {
    opacity: 0;
  }

  .flyoutTableHoverActions {
    .hoverActions-active {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }

    &:hover {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }
  }
`;
