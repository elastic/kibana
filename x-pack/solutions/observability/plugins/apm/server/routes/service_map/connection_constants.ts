/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum number of span / transaction ids collected to join the two sides of a connection
 * (source exit span ↔ target entry transaction). When a connection has more, the newest ones
 * are used and the response is flagged as sampled.
 */
export const MAX_CONNECTION_IDS = 1000;

/**
 * Widens the time range of a join query so documents linked to an in-range document are found
 * even when their own timestamp falls just outside the window: a transaction starts before its
 * exit spans, and a target entry transaction starts after the exit span that called it.
 */
export const CONNECTION_JOIN_TIME_BUFFER_MS = 5 * 60 * 1000;
