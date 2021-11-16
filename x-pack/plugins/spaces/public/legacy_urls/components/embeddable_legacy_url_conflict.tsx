/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EmbeddableLegacyUrlConflictProps } from '../types';
import type { InternalProps } from './embeddable_legacy_url_conflict_internal';

export const getEmbeddableLegacyUrlConflict = async (
  internalProps: InternalProps
): Promise<React.FC<EmbeddableLegacyUrlConflictProps>> => {
  const { EmbeddableLegacyUrlConflictInternal } = await import(
    './embeddable_legacy_url_conflict_internal'
  );
  return (props: EmbeddableLegacyUrlConflictProps) => {
    return <EmbeddableLegacyUrlConflictInternal {...{ ...internalProps, ...props }} />;
  };
};
