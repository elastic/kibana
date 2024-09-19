/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { LegacyUrlConflictProps } from '../types';
import type { InternalProps } from './legacy_url_conflict_internal';

export const getLegacyUrlConflict = async (
  internalProps: InternalProps
): Promise<React.FC<LegacyUrlConflictProps>> => {
  const { LegacyUrlConflictInternal } = await import('./legacy_url_conflict_internal');
  return (props: LegacyUrlConflictProps) => {
    return <LegacyUrlConflictInternal {...{ ...internalProps, ...props }} />;
  };
};
