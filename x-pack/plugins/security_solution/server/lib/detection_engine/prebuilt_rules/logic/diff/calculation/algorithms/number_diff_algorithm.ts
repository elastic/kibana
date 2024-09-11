/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeVersionsOf } from '../../../../../../../../common/api/detection_engine';
import { simpleDiffAlgorithm } from './simple_diff_algorithm';

export const numberDiffAlgorithm = <TValue extends number | undefined>(
  versions: ThreeVersionsOf<TValue>
) => simpleDiffAlgorithm<TValue>(versions);
