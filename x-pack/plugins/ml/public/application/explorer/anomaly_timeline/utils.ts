/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneData } from '../explorer_utils';

export const getFilteredSwimLaneData = (swimLaneData: SwimlaneData, severity: number) => {
  const result = { ...swimLaneData };
  result.points = result.points.filter(({ value }) => value >= severity);
  return result;
};
