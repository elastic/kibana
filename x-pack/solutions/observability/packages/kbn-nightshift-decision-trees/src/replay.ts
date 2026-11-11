/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prefix every replayed round's conversation id carries. Real conversation ids never start with
 * it, so a replay cannot record its writes under an investigation it does not own.
 */
export const REPLAY_CONVERSATION_ID_PREFIX = 'nightshift-reinforcement-replay-';
