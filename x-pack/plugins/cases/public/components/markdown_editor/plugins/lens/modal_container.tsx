/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

export const ModalContainer = styled(EuiFlexGroup)`
  width: ${({ theme }) => theme.eui.euiBreakpoints.m};
  height: 100%;

  .euiModalBody {
    min-height: 300px;
  }
`;
