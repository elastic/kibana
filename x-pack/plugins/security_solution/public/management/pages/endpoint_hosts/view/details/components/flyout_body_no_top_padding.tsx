/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiFlyoutBody } from '@elastic/eui';

/**
 * Removes the `padding-top` from the `EuiFlyoutBody` component. Normally done when there is a
 * sub-header present above the flyout body.
 */
export const FlyoutBodyNoTopPadding = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding-top: 0;
  }
`;
