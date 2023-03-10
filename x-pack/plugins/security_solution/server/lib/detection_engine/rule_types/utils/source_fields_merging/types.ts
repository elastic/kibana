/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalSourceHit } from '../../types';

/**
 * A bit stricter typing since the default fields type is an "any"
 */
export type FieldsType = string[] | number[] | boolean[] | object[];

/**
 * The type of the merge strategy functions which must implement to be part of the strategy group
 * @param doc The document to send in to merge
 * @param ignoreFields Fields you want to ignore and not merge.
 */
export type MergeStrategyFunction = ({
  doc,
  ignoreFields,
}: {
  doc: SignalSourceHit;
  ignoreFields: string[];
}) => SignalSourceHit;
