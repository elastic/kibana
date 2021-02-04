/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomaliesHostTableProps } from '../types';

export const hostEquality = (
  prevProps: AnomaliesHostTableProps,
  nextProps: AnomaliesHostTableProps
): boolean =>
  prevProps.startDate === nextProps.startDate &&
  prevProps.endDate === nextProps.endDate &&
  prevProps.skip === nextProps.skip;
