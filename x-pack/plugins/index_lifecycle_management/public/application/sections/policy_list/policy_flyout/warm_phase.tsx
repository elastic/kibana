/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { Readonly } from './readonly';
import { SerializedWarmPhase } from '../../../../../common/types';

import { i18nTexts } from '../../edit_policy/i18n_texts';
import { MinAge } from './min_age';
import { Shrink } from './shrink';
import { Downsample } from './downsample';
import { IndexPriority } from './index_priority';
import { Forcemerge } from './forcemerge';
import { Replicas } from './replicas';
import { DataAllocation } from './data_allocation';

export const WarmPhase = ({ phase }: { phase: SerializedWarmPhase }) => {
  return (
    <>
      <EuiTitle size="s">
        <h2>{i18nTexts.editPolicy.titles.warm}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <MinAge minAge={phase.min_age} />

      <Replicas allocate={phase.actions.allocate} />
      <Shrink shrink={phase.actions.shrink} />
      <Forcemerge forcemerge={phase.actions.forcemerge} />
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
