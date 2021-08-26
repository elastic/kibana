/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CopyToSpaceFlyoutProps } from '../types';

export const getCopyToSpaceFlyoutComponent = async (): Promise<
  React.FC<CopyToSpaceFlyoutProps>
> => {
  const { CopyToSpaceFlyoutInternal } = await import('./copy_to_space_flyout_internal');
  return (props: CopyToSpaceFlyoutProps) => {
    return <CopyToSpaceFlyoutInternal {...props} />;
  };
};
