/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyStyledComponent } from 'styled-components';
import styled from 'styled-components';
import { EuiInMemoryTable } from '@elastic/eui';

export const SummaryTable = styled(EuiInMemoryTable as unknown as AnyStyledComponent)`
  .inlineActions {
    opacity: 0;
  }

  .flyoutTableHoverActions {
    .inlineActions-popoverOpen {
      opacity: 1;
    }

    &:hover {
      .inlineActions {
        opacity: 1;
      }
    }
  }
`;
