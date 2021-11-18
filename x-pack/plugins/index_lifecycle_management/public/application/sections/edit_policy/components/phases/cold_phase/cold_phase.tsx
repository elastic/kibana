/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { useConfiguration } from '../../../form';
import {
  DataTierAllocationField,
  SearchableSnapshotField,
  IndexPriorityField,
  ReplicasField,
  ReadonlyField,
} from '../shared_fields';

import { Phase } from '../phase';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.description', {
      defaultMessage:
        'Move data to nodes optimized for less frequent, read-only access. Store data in the cold phase on less-expensive hardware.',
    }),
  },
};

export const ColdPhase: FunctionComponent = () => {
  const { isUsingSearchableSnapshotInHotPhase } = useConfiguration();

  return (
    <Phase phase="cold" topLevelSettings={<SearchableSnapshotField phase="cold" />}>
      <ReplicasField phase="cold" />

      {/* Readonly section */}
      {!isUsingSearchableSnapshotInHotPhase && <ReadonlyField phase="cold" />}

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase="cold"
      />

      <IndexPriorityField phase="cold" />
    </Phase>
  );
};
