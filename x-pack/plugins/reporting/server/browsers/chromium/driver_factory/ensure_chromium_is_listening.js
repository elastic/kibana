/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';

// See https://github.com/elastic/kibana/issues/19351 for why this is necessary. Long story short, on certain
// linux platforms (fwiw, we have only experienced this on jenkins agents) the first bootup of chromium takes
// a long time doing something with fontconfig packages loading up a cache. The cdp command will timeout
// if we don't wait for this manually. Note that this may still timeout based on the value of
// xpack.reporting.queue.timeout. Subsequent runs should be fast because the cache will already be
// initialized.
/**
 *
 * @param {string} port
 * @return {Promise}
 */
export async function ensureChromiumIsListening(port) {
  const options = {
    port,
    hostname: '127.0.0.1',
    method: 'CONNECT',
    timeout: 120000,
  };

  return new Promise((resolve, reject) => {
    http.get(options, () => resolve())
      .on('error', e => reject(e));
  });
}
