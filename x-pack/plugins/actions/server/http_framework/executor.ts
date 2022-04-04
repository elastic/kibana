/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { HTTPConnectorType } from './types';

const buildHandler = () => {};

export const buildExecutor = <Config, Secrets, Params>({
  connector,
  logger,
}: {
  connector: HTTPConnectorType<Config, Secrets, Params>;
  logger: Logger;
}) => {};
