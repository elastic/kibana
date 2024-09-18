/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { DeleteSearchableSnapshotField } from './delete_searchable_snapshot_field';
import { Phase } from '../phase';
import { SnapshotPoliciesField } from '../shared_fields';

export const DeletePhase: FunctionComponent = () => {
  return (
    <Phase
      phase="delete"
      topLevelSettings={
        <>
          <SnapshotPoliciesField />
          <DeleteSearchableSnapshotField />
        </>
      }
    />
  );
};
