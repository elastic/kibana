/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mix = (start, end, a) => start * (1 - a) + end * a; // like the glsl function
export const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n);
export const unitClamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
