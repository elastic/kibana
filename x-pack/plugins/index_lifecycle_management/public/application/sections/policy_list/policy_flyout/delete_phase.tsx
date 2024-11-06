/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PhaseDescription } from './phase_description';
import { Phases } from '../../../../../common/types';
import { MinAge, WaitForSnapshot, DeleteSearchableSnapshot } from './components';

export const DeletePhase = ({ phases }: { phases: Phases }) => {
  return (
    <PhaseDescription
      phase={'delete'}
      phases={phases}
      components={[MinAge, WaitForSnapshot, DeleteSearchableSnapshot]}
    />
  );
};
