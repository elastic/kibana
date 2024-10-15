/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphState } from '../../../../types';

export const discardPreviousRefinements = ({
  generationAttempts,
  hallucinationFailures,
  isHallucinationDetected,
  state,
}: {
  generationAttempts: number;
  hallucinationFailures: number;
  isHallucinationDetected: boolean;
  state: GraphState;
}): GraphState => {
  return {
    ...state,
    combinedRefinements: '', // <-- reset the combined refinements
    generationAttempts: generationAttempts + 1,
    refinements: [], // <-- reset the refinements
    hallucinationFailures: isHallucinationDetected
      ? hallucinationFailures + 1
      : hallucinationFailures,
  };
};
