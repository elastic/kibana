/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeStrategyFunction } from '../types';

/**
 * Does nothing and does not merge source with fields
 * @param doc The doc to return and do nothing
 * @param ignoreFields We do nothing with this value and ignore it if set
 * @returns The doc as a no operation and do nothing
 */
export const mergeNoFields: MergeStrategyFunction = ({ doc, ignoreFields }) => doc;
