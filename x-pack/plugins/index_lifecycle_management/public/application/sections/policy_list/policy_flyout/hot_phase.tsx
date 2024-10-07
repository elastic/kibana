/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PhaseDescription } from './phase_description';
import { Phases } from '../../../../../common/types';
import {
  Rollover,
  Forcemerge,
  Shrink,
  SearchableSnapshot,
  Downsample,
  Readonly,
  IndexPriority,
} from './components';

export const HotPhase = ({ phases }: { phases: Phases }) => {
  return (
    <PhaseDescription
      phase={'hot'}
      phases={phases}
      components={[
        Rollover,
        Forcemerge,
        Shrink,
        SearchableSnapshot,
        Downsample,
        Readonly,
        IndexPriority,
      ]}
    />
  );
};
