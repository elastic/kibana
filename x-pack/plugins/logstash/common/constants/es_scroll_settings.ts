/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ES_SCROLL_SETTINGS = {
  // How long to keep a scroll alive
  KEEPALIVE: '30s',

  // How many results to return per scroll response
  PAGE_SIZE: 100,
};
