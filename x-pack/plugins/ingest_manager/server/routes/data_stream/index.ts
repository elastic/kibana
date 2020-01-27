/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { IngestManagerAppContext } from '../../';
import { PLUGIN_ID, DATA_STREAM_API_ROUTES } from '../../constants';
import {
  GetDataStreamsRequestSchema,
  GetOneDataStreamRequestSchema,
  CreateDataStreamRequestSchema,
  UpdateDataStreamRequestSchema,
} from '../../types';
import {
  getDataStreamsHandler,
  getOneDataStreamHandler,
  createDataStreamHandler,
  updateDataStreamHandler,
} from './handlers';

export const registerRoutes = (router: IRouter) => {
  // List
  router.get(
    {
      path: DATA_STREAM_API_ROUTES.LIST_PATTERN,
      validate: GetDataStreamsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getDataStreamsHandler
  );

  // Get one
  router.get(
    {
      path: DATA_STREAM_API_ROUTES.INFO_PATTERN,
      validate: GetOneDataStreamRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getOneDataStreamHandler
  );

  // Create
  router.post(
    {
      path: DATA_STREAM_API_ROUTES.CREATE_PATTERN,
      validate: CreateDataStreamRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    createDataStreamHandler
  );

  // Update
  router.put(
    {
      path: DATA_STREAM_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateDataStreamRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    updateDataStreamHandler
  );
};
