/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts milliseconds to nanoseconds.
 * NOTE: Math.round handles floating point precision errors. In JS 1.25 + 3.14 = 4.390000000000001.
 * Having float nanoseconds doesn't make sense, also ECS event.duration is of type long.
 * @param ms Number of milliseconds.
 */
export const toNano = (ms: number): number => Math.round(ms * 1000000);

// NOTE: It's safer to use reduce rather than Math.max(...array). The latter won't handle large input.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
export const maxOf = (array: number[]): number => array.reduce((a, b) => Math.max(a, b));
export const minOf = (array: number[]): number => array.reduce((a, b) => Math.min(a, b));
export const sumOf = (array: number[]): number => array.reduce((a, b) => a + b, 0);
