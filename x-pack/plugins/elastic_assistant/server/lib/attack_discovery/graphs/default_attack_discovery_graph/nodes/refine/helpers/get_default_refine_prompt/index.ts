/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDefaultRefinePrompt =
  (): string => `You previously generated the following insights, but sometimes they represent the same attack.

Combine the insights below, but only if they represent the same attack; (don't modify any insights that are not combined):`;
