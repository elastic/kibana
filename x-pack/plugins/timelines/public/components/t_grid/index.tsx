/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TGridProps } from '../../types';
import { TGridIntegrated, TGridIntegratedProps } from './integrated';
import { TGridStandalone, TGridStandaloneProps } from './standalone';

export const TGrid = (props: TGridProps) => {
  const { type, ...componentsProps } = props;
  if (type === 'standalone') {
    return <TGridStandalone {...(componentsProps as unknown as TGridStandaloneProps)} />;
  } else if (type === 'embedded') {
    return <TGridIntegrated {...(componentsProps as unknown as TGridIntegratedProps)} />;
  }
  return null;
};

// eslint-disable-next-line import/no-default-export
export { TGrid as default };
