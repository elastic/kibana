/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { SerializedHotPhase } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';
import { Rollover } from './rollover';
import { Forcemerge } from './forcemerge';
import { Shrink } from './shrink';
import { Downsample } from './downsample';
import { IndexPriority } from './index_priority';
import { Readonly } from './readonly';
import { SearchableSnapshot } from './searchable_snapshot';

export const HotPhase = ({ phase }: { phase: SerializedHotPhase }) => {
  return (
    <>
      <EuiTitle size="s">
        <h2>{i18nTexts.editPolicy.titles.hot}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <Rollover rollover={phase.actions.rollover} />
      <Forcemerge forcemerge={phase.actions.forcemerge} />
      <Shrink shrink={phase.actions.shrink} />
      <SearchableSnapshot searchableSnapshot={phase.actions.searchable_snapshot} />
      <Downsample downsample={phase.actions.downsample} />
      <Readonly readonly={phase.actions.readonly} />
      <IndexPriority indexPriority={phase.actions.set_priority} />
    </>
  );
};
