/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { useConfigurationIssues } from '../../../form';

import {
  ForcemergeField,
  IndexPriorityField,
  DataTierAllocationField,
  ShrinkField,
  ReadonlyField,
  ReplicasField,
} from '../shared_fields';

import { Phase } from '../phase';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.description', {
      defaultMessage: 'Move data to nodes optimized for less-frequent, read-only access.',
    }),
  },
};

export const WarmPhase: FunctionComponent = () => {
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();

  return (
    <Phase phase={'warm'}>
      <ReplicasField phase={'warm'} />

      {!isUsingSearchableSnapshotInHotPhase && <ShrinkField phase={'warm'} />}

      {!isUsingSearchableSnapshotInHotPhase && <ForcemergeField phase={'warm'} />}

      <ReadonlyField phase={'warm'} />

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase={'warm'}
      />

      <IndexPriorityField phase={'warm'} />
    </Phase>
  );
};
