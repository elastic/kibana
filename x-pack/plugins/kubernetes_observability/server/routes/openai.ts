/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { AzureOpenAI } from 'openai';
import { AZURE_OPENAI_ENDPOINT, OPENAI_API_VERSION, CHAT_COMPLETIONS_DEPLOYMENT_NAME } from '../../common/openai_constants'
import { IRouter, Logger } from '@kbn/core/server';
import { MaybePromise } from '@kbn/utility-types';
import {
    OPENAI_ROUTE,
} from '../../common/constants';

export const registerOpenaiRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: OPENAI_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              content: schema.string(),
              assistant_id: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response:MaybePromise<any>) => {
        console.log("CALLED");
        const apiKey = process.env["AZURE_OPENAI_API_KEY"] || "<api key>";
        const azureClient = new AzureOpenAI({  apiKey: apiKey, apiVersion: OPENAI_API_VERSION, endpoint: AZURE_OPENAI_ENDPOINT });  
        console.log(request.query.content);
        console.log(azureClient);
        var assistant_id = '';
        if (request.query.assistant_id === undefined) {
            const assistant = await azureClient.beta.assistants.create({instructions:"Hello",
                model:CHAT_COMPLETIONS_DEPLOYMENT_NAME, //replace with model deployment name.
                temperature: 0.2,
            });
            assistant_id = assistant.id;
        } else {
            assistant_id = request.query.assistant_id;
        }
        
        console.log("Assistant");
        // console.log(assistant);
        const thread = await azureClient.beta.threads.create();
        console.log(thread);
        const message = await azureClient.beta.threads.messages.create(
            thread.id,
            {
              role: "user",
              content: request.query.content
            }
        );
        console.log(message);
        const run = await azureClient.beta.threads.runs.createAndPoll(
            thread.id,
            { 
              assistant_id: assistant_id,
              instructions: "Please address the request."
            }
        );
        
        if (run.status === 'completed') {
            const messages = await azureClient.beta.threads.messages.list(
                run.thread_id
            );
            for (const message of messages.data.reverse()) {
                if (message.role == "assistant"){
                    if ('text' in message.content[0]) {
                        console.log(`${message.role} > ${message.content[0].text.value}`);
                        return response.ok({
                            body: {
                              response: message.content[0].text.value,
                              assistant: assistant_id
                            },
                        });
                    }
                }
            }
        } else {
            console.log(run.status);
            return response.ok({
                body: {
                  response: run.status,
                  assistant: assistant_id
                },
            });
        }
        
      }
    );
};