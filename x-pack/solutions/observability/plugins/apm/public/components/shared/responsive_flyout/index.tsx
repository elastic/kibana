/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlyout } from '@elastic/eui';
import styled, { type StyledComponent } from '@emotion/styled';

// The return type of this component needs to be specified because the inferred
// return type depends on types that are not exported from EUI. You get a TS4023
// error if the return type is not specified.
export const ResponsiveFlyout: StyledComponent<EuiFlyoutProps> = styled(
  ({
    className,
    ...flyoutProps
  }: {
    className?: string;
  } & EuiFlyoutProps) => <EuiFlyout {...flyoutProps} className={className} />
)`
  width: 100%;

  @media (min-width: 800px) {
    width: 90%;
  }

  @media (min-width: 1000px) {
    width: 80%;
  }

  @media (min-width: 1400px) {
    width: 70%;
  }

  @media (min-width: 2000px) {
    width: 60%;
  }
`;
