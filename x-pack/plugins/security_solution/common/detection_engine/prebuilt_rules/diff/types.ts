/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidatedRuleToImport } from '../../../api/detection_engine';

/**
 * This type represents the minimal rule representation that can be
 * converted to the DiffableRule type.
 */
export type DiffableRuleInput = ValidatedRuleToImport;
