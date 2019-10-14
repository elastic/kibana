/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Utility function to delay execution of the event loop for a specified duration.
 * @param duration {number} Minimum amount of time in milliseconds to delay execution
 */
export const delay = (duration: number) => new Promise(r => setTimeout(r, duration));
