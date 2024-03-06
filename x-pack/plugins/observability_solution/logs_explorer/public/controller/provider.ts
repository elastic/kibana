/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import type { LogsExplorerController } from './types';

const useLogsExplorerController = ({ controller }: { controller: LogsExplorerController }) =>
  controller;

export const [LogsExplorerControllerProvider, useLogsExplorerControllerContext] =
  createContainer(useLogsExplorerController);
