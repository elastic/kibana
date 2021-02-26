/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, PropsWithChildren } from 'react';
import type { InternalProps } from './wrapper';
import type { SpacesContextProps } from '../../../../../src/plugins/spaces_oss/public';

const SpacesContextWrapper = lazy(() => import('./wrapper'));

export const getSpacesContextWrapper = (
  internalProps: InternalProps
): React.FC<SpacesContextProps> => {
  return ({ children, ...props }: PropsWithChildren<SpacesContextProps>) => {
    return (
      <Suspense fallback={<div />}>
        <SpacesContextWrapper {...{ ...internalProps, ...props, children }} />
      </Suspense>
    );
  };
};
