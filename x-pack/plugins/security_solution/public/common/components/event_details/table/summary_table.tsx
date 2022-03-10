/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiInMemoryTable } from '@elastic/eui';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SummaryTable = styled(EuiInMemoryTable as any)`
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
