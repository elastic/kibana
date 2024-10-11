/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleEqlQuery,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { simpleDiffAlgorithm } from './simple_diff_algorithm';

/**
 * Diff algorithm for eql query types
 */
export const eqlQueryDiffAlgorithm = (versions: ThreeVersionsOf<RuleEqlQuery>) =>
  simpleDiffAlgorithm<RuleEqlQuery>(versions);
