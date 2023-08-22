/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { LLM } from 'langchain/llms/base';
import { get } from 'lodash/fp';

import { getMessageContentAndRole } from '../helpers';

const LLM_TYPE = 'ActionsClientLlm';

export class ActionsClientLlm extends LLM {
  #actions: ActionsPluginStart;
  #connectorId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #request: KibanaRequest<unknown, unknown, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #actionResultData: Record<string, any>;

  constructor({
    actions,
    connectorId,
    request,
  }: {
    actions: ActionsPluginStart;
    connectorId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: KibanaRequest<unknown, unknown, any, any>;
  }) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#request = request;
    this.#actionResultData = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActionResultData(): Record<string, any> {
    return this.#actionResultData;
  }

  _llmType() {
    return LLM_TYPE;
  }

  async _call(prompt: string): Promise<string> {
    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompt);

    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        subActionParams: {
          ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
          body: JSON.stringify({ messages: [assistantMessage] }),
        },
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      throw new Error(
        `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
    }

    const choices = get('data.choices', actionResult);

    if (Array.isArray(choices) && choices.length > 0) {
      // get the raw content from the first choice, because _call must return a string
      const content: string | undefined = choices[0]?.message?.content;

      if (typeof content !== 'string') {
        throw new Error(
          `${LLM_TYPE}: choices[0] message content should be a string, but it had an unexpected type: %{typeof content}`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.#actionResultData = actionResult.data as Record<string, any>; // save the raw response from the connector, because that's what the assistant expects

      return content; // per the contact of _call, return a string
    } else {
      throw new Error(`${LLM_TYPE}: choices is expected to be an non-empty array`);
    }
  }
}
