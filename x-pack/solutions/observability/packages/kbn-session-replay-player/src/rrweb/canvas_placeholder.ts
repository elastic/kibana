/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canvases that were not replayed show this pattern, so an empty chart reads as "not replayed"
 * instead of broken. It sits behind whatever the replay draws.
 */
export const CANVAS_PLACEHOLDER_RULE =
  'canvas { background-image: repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.28) 0, rgba(128, 128, 128, 0.28) 6px, transparent 6px, transparent 12px); }';
