/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomaliesNetworkTableProps } from '../types';
import { anomaliesTableDefaultEquality } from './default_equality';

export const networkEquality = (
  prevProps: AnomaliesNetworkTableProps,
  nextProps: AnomaliesNetworkTableProps
): boolean =>
  anomaliesTableDefaultEquality(prevProps, nextProps) &&
  prevProps.flowTarget === nextProps.flowTarget;
