/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { useConfigurationIssues } from '../../../form';
import {
  DataTierAllocationField,
  SearchableSnapshotField,
  IndexPriorityField,
  ReplicasField,
  FreezeField,
} from '../shared_fields';
import { Phase } from '../phase';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.frozenPhase.dataTier.description', {
      defaultMessage:
        'Move read-only data to nodes optimized for long-term storage. Nodes in the frozen phase often use your least expensive hardware.',
    }),
  },
};

export const FrozenPhase: FunctionComponent = () => {
  const {
    isUsingSearchableSnapshotInHotPhase,
    isUsingSearchableSnapshotInColdPhase,
  } = useConfigurationIssues();

  return (
    <Phase phase="frozen" topLevelSettings={<SearchableSnapshotField phase="frozen" />}>
      <ReplicasField phase="frozen" />

      {/* Freeze section */}
      {!isUsingSearchableSnapshotInHotPhase && !isUsingSearchableSnapshotInColdPhase && (
        <FreezeField phase="frozen" />
      )}

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase="frozen"
      />

      <IndexPriorityField phase="frozen" />
    </Phase>
  );
};
