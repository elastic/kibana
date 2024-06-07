/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, notFound } from '@hapi/boom';
import { withSpan } from '@kbn/apm-utils';
import type { KibanaRequest } from '@kbn/core-http-server';
import * as t from 'io-ts';
import { KnowledgeBaseEntryRole } from '../../../common';
import type { ObservabilityAIAssistantService } from '../../service';
import type { ObservabilityAIAssistantClient } from '../../service/client';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const publicCreateInstructionRequestParamsRt = t.type({
  body: t.type({
    id: t.string,
    instruction: t.string,
    public: t.boolean,
  }),
});

const publicCreateInstruction = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /api/observability_ai_assistant/instructions 2023-10-31',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: publicCreateInstructionRequestParamsRt,
  handler: async (resources) => {
    const instruction = resources.params.body;

    const client = await getAIAssistantClient(resources.service, resources.request);
    await assertKnowledgeBaseReady(client);

    const { status } = await withSpan('save_instruction', async () =>
      client.createKnowledgeBaseEntry({
        entry: {
          id: instruction.id,
          doc_id: instruction.id,
          text: instruction.instruction,
          labels: {
            category: 'instruction',
          },
          public: instruction.public,
          confidence: 'high',
          is_correction: false,
          role: KnowledgeBaseEntryRole.UserEntry,
        },
      })
    );

    if (status === 'conflict') {
      throw conflict(`Instruction with ID "${instruction.id}" already exists.`);
    }

    const basePath = (await resources.context.core).coreStart.http.basePath;
    return resources.response.custom({
      statusCode: 201,
      body: instruction,
      headers: {
        location: basePath.prepend(
          `/api/observability_ai_assistant/instructions/${instruction.id}`
        ),
      },
    });
  },
});

const publicReadInstructionRequestParamsRt = t.type({
  path: t.type({
    id: t.string,
  }),
});

const publicReadInstruction = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /api/observability_ai_assistant/instructions/{id} 2023-10-31',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: publicReadInstructionRequestParamsRt,
  handler: async (resources) => {
    const id = resources.params.path.id;

    const client = await getAIAssistantClient(resources.service, resources.request);
    await assertKnowledgeBaseReady(client);

    const result = await withSpan('load_instruction', async () =>
      client.getKnowledgeBaseEntry({ id })
    );

    if (result.status === 'not_found') {
      throw notFound();
    }

    const { entry } = result;

    return {
      instruction: {
        id: entry.id,
        instruction: entry.text,
        public: entry.public,
      },
    };
  },
});

const publicUpdateInstructionRequestParamsRt = t.type({
  path: t.type({
    id: t.string,
  }),
  body: t.type({
    instruction: t.string,
    public: t.boolean,
  }),
});

const publicUpdateInstruction = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /api/observability_ai_assistant/instructions/{id} 2023-10-31',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: publicUpdateInstructionRequestParamsRt,
  handler: async (resources) => {
    const id = resources.params.path.id;
    const instruction = resources.params.body;

    const client = await getAIAssistantClient(resources.service, resources.request);
    await assertKnowledgeBaseReady(client);

    const { status } = await withSpan('update_instruction', async () =>
      client.updateKnowledgeBaseEntry({
        entry: {
          id,
          text: instruction.instruction,
          public: instruction.public,
        },
      })
    );

    if (status === 'not_found') {
      throw notFound();
    }

    const basePath = (await resources.context.core).coreStart.http.basePath;
    return resources.response.custom({
      statusCode: 200,
      body: {
        id,
        ...instruction,
      },
      headers: {
        location: basePath.prepend(`/api/observability_ai_assistant/instructions/${id}`),
      },
    });
  },
});

const publicDeleteInstructionRequestParamsRt = t.type({
  path: t.type({
    id: t.string,
  }),
});

const publicDeleteInstruction = createObservabilityAIAssistantServerRoute({
  endpoint: 'DELETE /api/observability_ai_assistant/instructions/{id} 2023-10-31',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: publicDeleteInstructionRequestParamsRt,
  handler: async (resources) => {
    const client = await getAIAssistantClient(resources.service, resources.request);
    await assertKnowledgeBaseReady(client);

    const id = resources.params.path.id;

    const { status } = await withSpan(
      'delete_instruction',
      async () => await client.deleteKnowledgeBaseEntry({ id })
    );

    if (status === 'not_found') {
      throw notFound();
    }

    return resources.response.custom({
      statusCode: 204,
    });
  },
});

async function getAIAssistantClient(
  service: ObservabilityAIAssistantService,
  request: KibanaRequest
) {
  return withSpan('get_observability_ai_assistant_client', async () =>
    service.getClient({ request })
  );
}

async function assertKnowledgeBaseReady(client: ObservabilityAIAssistantClient) {
  return withSpan('assert_knowledge_base_ready', async () => {
    const status = await client.getKnowledgeBaseStatus();

    if (!status.ready) {
      // See https://github.com/elastic/kibana/issues/183739 which is needed to offer a better response
      throw badRequest(`Knowledge base is not installed.`);
    }
  });
}

export const instructionRoutes = {
  ...publicCreateInstruction,
  ...publicReadInstruction,
  ...publicUpdateInstruction,
  ...publicDeleteInstruction,
};
