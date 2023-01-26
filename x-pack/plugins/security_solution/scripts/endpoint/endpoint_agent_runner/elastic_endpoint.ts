/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuntimeServices } from './runtime';

export const enrollEndpointHost = async () => {
  const { log } = getRuntimeServices();

  log.info(`Creating VM and enrolling endpoint`);

  //
};
