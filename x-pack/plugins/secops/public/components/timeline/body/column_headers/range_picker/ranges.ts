/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** Date ranges applicable to the MiniMap */
export type Range = '1 Day' | '1 Week' | '1 Month' | '1 Year';

/** Enables runtime enumeration of valid `Range`s */
export const Ranges: Range[] = ['1 Day', '1 Week', '1 Month', '1 Year'];
