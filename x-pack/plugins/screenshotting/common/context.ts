/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Screenshot context.
 * This is a serializable object that can be passed from the screenshotting backend and then deserialized on the target page.
 */
export type Context = Record<string, unknown>;

/**
 * @interal
 */
export const SCREENSHOTTING_CONTEXT_KEY = '__SCREENSHOTTING_CONTEXT_KEY__';
