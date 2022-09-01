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
import { useAlertsTableConfiguration } from './config';

export const TGrid = (props: TGridProps) => {
  const { type, ...componentsProps } = props;
  // TODO: this looks like a nasty side-effect right now and it is
  // Do we need to react to changing columns? If so, this needs to move to the internal state.
  useAlertsTableConfiguration({ columns: props.columns });
  if (type === 'standalone') {
    return <TGridStandalone {...(componentsProps as unknown as TGridStandaloneProps)} />;
  } else if (type === 'embedded') {
    return <TGridIntegrated {...(componentsProps as unknown as TGridIntegratedProps)} />;
  }
  return null;
};

// eslint-disable-next-line import/no-default-export
export { TGrid as default };
