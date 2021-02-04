/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_SCROLL_SETTINGS: {
  KEEPALIVE: string;
  PAGE_SIZE: number;
} = {
  // How long to keep a scroll alive
  KEEPALIVE: '30s',

  // How many results to return per scroll response
  PAGE_SIZE: 100,
};
