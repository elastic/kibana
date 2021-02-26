/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { LegacyUrlConflictProps } from 'src/plugins/spaces_oss/public';
import type { InternalProps } from './legacy_url_conflict_internal';

const LegacyUrlConflictInternal = React.lazy(() => import('./legacy_url_conflict_internal'));

export const getLegacyUrlConflict = (
  internalProps: InternalProps
): React.FC<LegacyUrlConflictProps> => {
  return (props: LegacyUrlConflictProps) => {
    return (
      <Suspense fallback={<div />}>
        <LegacyUrlConflictInternal {...{ ...internalProps, ...props }} />{' '}
      </Suspense>
    );
  };
};
