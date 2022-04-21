/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverallSwimlaneData, SwimlaneData } from './explorer_utils';
import type { FilterSettings } from './anomaly_explorer_common_state';

interface HasMatchingPointsParams {
  filteredFields?: FilterSettings['filteredFields'];
  swimlaneData: SwimlaneData | OverallSwimlaneData;
}

export const hasMatchingPoints = ({
  filteredFields = [],
  swimlaneData,
}: HasMatchingPointsParams): boolean => {
  // If filtered fields includes a wildcard search maskAll only if there are no points matching the pattern
  const wildCardField = filteredFields.find((field) => /\@kuery-wildcard\@$/.test(field as string));
  const substring =
    wildCardField !== undefined
      ? (wildCardField as string).replace(/\@kuery-wildcard\@$/, '')
      : null;

  return (
    substring !== null &&
    swimlaneData.points.some((point) => {
      return point.laneLabel.includes(substring);
    })
  );
};
