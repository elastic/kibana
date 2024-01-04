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
    subActionParams: t.intersection([
      t.type({
        messages: t.array(
          t.type({
            // must match ConversationRole from '@kbn/elastic-assistant
            role: t.union([t.literal('system'), t.literal('user'), t.literal('assistant')]),
            content: t.string,
          })
        ),
      }),
      t.partial({
        model: t.string,
        n: t.number,
        stop: t.union([t.string, t.array(t.string), t.null]),
        temperature: t.number,
      }),
    ]),
    subAction: t.string,
  }),
  alertsIndexPattern: t.union([t.string, t.undefined]),
  allow: t.union([t.array(t.string), t.undefined]),
  allowReplacement: t.union([t.array(t.string), t.undefined]),
  isEnabledKnowledgeBase: t.boolean,
  isEnabledRAGAlerts: t.boolean,
  replacements: t.union([t.record(t.string, t.string), t.undefined]),
  size: t.union([t.number, t.undefined]),
});

export type PostActionsConnectorExecuteBodyInputs = t.TypeOf<
  typeof PostActionsConnectorExecuteBody
>;
