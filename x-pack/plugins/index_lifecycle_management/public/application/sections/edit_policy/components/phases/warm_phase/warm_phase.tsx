/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { Phases } from '../../../../../../../common/types';

import { useConfigurationIssues } from '../../../form';

import {
  ForcemergeField,
  DataTierAllocationField,
  ShrinkField,
  ReadonlyField,
  ReplicasField,
  IndexPriorityField,
} from '../shared_fields';

import { Phase } from '../phase';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.description', {
      defaultMessage: 'Move data to nodes optimized for less-frequent, read-only access.',
    }),
  },
};

const warmProperty: keyof Phases = 'warm';

export const WarmPhase: FunctionComponent = () => {
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();

  return (
    <Phase phase={warmProperty}>
      <ReplicasField phase={warmProperty} />

      {!isUsingSearchableSnapshotInHotPhase && <ShrinkField phase={warmProperty} />}

      {!isUsingSearchableSnapshotInHotPhase && <ForcemergeField phase={warmProperty} />}

      <ReadonlyField phase={warmProperty} />

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase={warmProperty}
      />

      <IndexPriorityField phase={warmProperty} />
    </Phase>
  );
};
