/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { DownsampleField, SearchableSnapshotField } from '../shared_fields';
import { Phase } from '../phase';
import { useConfiguration } from '../../../form';

export const FrozenPhase: FunctionComponent = () => {
  const { isUsingSearchableSnapshotInHotPhase, isUsingSearchableSnapshotInColdPhase } =
    useConfiguration();
  return (
    <Phase
      phase="frozen"
      topLevelSettings={<SearchableSnapshotField phase="frozen" canBeDisabled={false} />}
    >
      {!(isUsingSearchableSnapshotInHotPhase || isUsingSearchableSnapshotInColdPhase) && (
        <DownsampleField phase="frozen" />
      )}
    </Phase>
  );
};
