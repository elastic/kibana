/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefendInsightsType } from '../../../../../common/endpoint/types/defend_insights';

import { InvalidDefendInsightTypeError } from '../errors';
import { getConflictingAntivirusPrompt } from './conflicting_antivirus';

export const getDefendInsightsPrompt = ({
  type,
  anonymizedValues,
}: {
  type: DefendInsightsType;
  anonymizedValues: string[];
}) => {
  if (type === 'conflicting_antivirus') {
    return getConflictingAntivirusPrompt({ anonymizedValues });
  }

  throw new InvalidDefendInsightTypeError();
};
