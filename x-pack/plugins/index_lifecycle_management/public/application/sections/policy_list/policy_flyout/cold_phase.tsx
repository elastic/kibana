/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { SearchableSnapshot } from './searchable_snapshot';
import { Readonly } from './readonly';
import { SerializedColdPhase } from '../../../../../common/types';

import { i18nTexts } from '../../edit_policy/i18n_texts';
import { MinAge } from './min_age';
import { Downsample } from './downsample';
import { IndexPriority } from './index_priority';
import { Replicas } from './replicas';
import { DataAllocation } from './data_allocation';

export const ColdPhase = ({ phase }: { phase: SerializedColdPhase }) => {
  return (
    <>
      <EuiTitle size="s">
        <h2>{i18nTexts.editPolicy.titles.cold}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <MinAge minAge={phase.min_age} />

      <SearchableSnapshot searchableSnapshot={phase.actions.searchable_snapshot} />
      <Replicas allocate={phase.actions.allocate} />
      <Downsample downsample={phase.actions.downsample} />
      <Readonly readonly={phase.actions.readonly} />
      <DataAllocation
        phase={'warm'}
        allocate={phase.actions.allocate}
        migrate={phase.actions.migrate}
      />
      <IndexPriority indexPriority={phase.actions.set_priority} />
    </>
  );
};
