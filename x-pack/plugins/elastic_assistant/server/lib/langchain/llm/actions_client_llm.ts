/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { LLM } from 'langchain/llms/base';
import { get } from 'lodash/fp';

import { getMessageContentAndRole } from '../helpers';
import { RequestBody } from '../types';

const LLM_TYPE = 'ActionsClientLlm';

export class ActionsClientLlm extends LLM {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest<unknown, unknown, RequestBody>;
  #actionResultData: string;

  constructor({
    actions,
    connectorId,
    logger,
    request,
  }: {
    actions: ActionsPluginStart;
    connectorId: string;
    logger: Logger;
    request: KibanaRequest<unknown, unknown, RequestBody>;
  }) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#logger = logger;
    this.#request = request;
    this.#actionResultData = '';
  }

  getActionResultData(): string {
    return this.#actionResultData;
  }

  _llmType() {
    return LLM_TYPE;
  }

  async _call(prompt: string): Promise<string> {
    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompt);
    this.#logger.debug(
      `ActionsClientLlm#_call assistantMessage:\n ${JSON.stringify(assistantMessage)} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        ...this.#request.body.params, // the original request body params
        subActionParams: {
          ...this.#request.body.params.subActionParams, // the original request body params.subActionParams
          messages: [assistantMessage], // the assistant message
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

    // TODO: handle errors from the connector
    const content = get('data', actionResult);

    if (typeof content !== 'string') {
      throw new Error(
        `${LLM_TYPE}: content should be a string, but it had an unexpected type: ${typeof content}`
      );
    }
    this.#actionResultData = content; // save the raw response from the connector, because that's what the assistant expects

    return content; // per the contact of _call, return a string
  }
}
