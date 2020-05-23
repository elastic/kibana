/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Ensure an API request resolves after a brief yet noticeable delay, giving users time to recognize
// a spinner or other feedback without it flickering.
export function createNoticeableDelay(promise) {
  const noticeableDelay = new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, 300)
  );

  return Promise.all([promise, noticeableDelay]);
}
