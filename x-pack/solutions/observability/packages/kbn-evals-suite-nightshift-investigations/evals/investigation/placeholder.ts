/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from './types';

export const ungradedPlaceholder: Evaluator<InvestigationExample, InvestigationTaskOutput> = {
  name: 'ungraded_placeholder',
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async () => ({
    score: 1,
    label: 'ungraded',
    explanation:
      'Placeholder only: no quality evaluation was performed. Execution and trace validation are checked separately.',
  }),
};
