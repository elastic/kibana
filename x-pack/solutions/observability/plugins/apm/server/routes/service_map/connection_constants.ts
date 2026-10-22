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
