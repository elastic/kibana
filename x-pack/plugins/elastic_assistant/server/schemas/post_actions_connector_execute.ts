/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/** Validates the URL path of a POST request to the `/actions/connector/{connector_id}/_execute` endpoint */
export const PostActionsConnectorExecutePathParams = t.type({
  connectorId: t.string,
});

/** Validates the body of a POST request to the `/actions/connector/{connector_id}/_execute` endpoint */
export const PostActionsConnectorExecuteBody = t.type({
  params: t.type({
    subActionParams: t.type({
      body: t.string,
    }),
    subAction: t.string,
  }),
});

export type PostActionsConnectorExecuteBodyInputs = t.TypeOf<
  typeof PostActionsConnectorExecuteBody
>;
