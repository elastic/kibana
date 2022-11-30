/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const ContextTypeUser = z.object({
  comment: z.string(),
  type: z.literal('user'),
  owner: z.string(),
});

const AlertCommentRequest = z
  .object({
    type: z.literal('alert'),
    alertId: z.union([z.array(z.string()), z.string()]),
    index: z.union([z.array(z.string()), z.string()]),
    rule: z.object({
      id: z.nullable(z.string()),
      name: z.nullable(z.string()),
    }),
    owner: z.string(),
  })
  .strict();

const ActionsCommentRequest = z
  .object({
    type: z.literal('actions'),
    comment: z.string(),
    actions: z.object({
      targets: z.array(
        z.object({
          hostname: z.string(),
          endpointId: z.string(),
        })
      ),
      type: z.string(),
    }),
    owner: z.string(),
  })
  .strict();

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

const ExternalReferenceBase = z.object({
  externalReferenceAttachmentTypeId: z.string(),
  externalReferenceMetadata: z.nullable(z.record(z.string(), jsonSchema)),
  type: z.literal('externalReference'),
  owner: z.string(),
});

const ExternalReferenceSO = z
  .object({
    externalReferenceId: z.string(),
    externalReferenceStorage: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('savedObject'),
        soType: z.string(),
      }),
      z.object({
        type: z.literal('elasticSearchDoc'),
      }),
    ]),
  })
  .merge(ExternalReferenceBase)
  .strict();

const PersistableStateAttachment = z
  .object({
    type: z.literal('persistableState'),
    owner: z.string(),
    persistableStateAttachmentTypeId: z.string(),
    persistableStateAttachmentState: z.record(z.string(), jsonSchema),
  })
  .strict();

const CommentRequest = z.discriminatedUnion('type', [
  ContextTypeUser,
  AlertCommentRequest,
  ActionsCommentRequest,
  ExternalReferenceSO,
  PersistableStateAttachment,
]);

export const BulkCreateCommentRequest = z.array(CommentRequest);
