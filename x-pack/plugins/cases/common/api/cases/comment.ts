/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { jsonSchema } from '../runtime_types';

import { UserSchema } from '../user';
import { SavedObjectFindOptionsSchema } from '..';

const CommentAttributesBasicSchema = z.strictObject({
  created_at: z.string(),
  created_by: UserSchema,
  owner: z.string(),
  pushed_at: z.nullable(z.string()),
  pushed_by: z.nullable(UserSchema),
  updated_at: z.nullable(z.string()),
  updated_by: z.nullable(UserSchema),
});

export enum CommentType {
  user = 'user',
  alert = 'alert',
  actions = 'actions',
  externalReference = 'externalReference',
  persistableState = 'persistableState',
}

export enum IsolateHostActionType {
  isolate = 'isolate',
  unisolate = 'unisolate',
}

export const ContextTypeUserSchema = z.strictObject({
  comment: z.string(),
  type: z.literal(CommentType.user),
  owner: z.string(),
});

const alertIdIndexValidation = (decodedVal: { type: CommentType }, ctx: z.RefinementCtx) => {
  if (!isAlertType(decodedVal)) {
    return;
  }

  // TODO: refactor the getIDsAndIndicesAsArrays function so that it is in common and use that instead
  const ids = Array.isArray(decodedVal.alertId) ? decodedVal.alertId : [decodedVal.alertId];
  const indices = Array.isArray(decodedVal.index) ? decodedVal.index : [decodedVal.index];

  if (ids.length !== indices.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Received an alert comment with ids and indices arrays of different lengths ids: ${JSON.stringify(
        ids
      )} indices: ${JSON.stringify(indices)}`,
    });
  }
};

const isAlertType = (decodedVal: {
  type: CommentType;
}): decodedVal is z.infer<typeof AlertCommentRequestSchema> => {
  return decodedVal.type === CommentType.alert;
};

/**
 * This defines the structure of how alerts (generated or user attached) are stored in saved objects documents. It also
 * represents of an alert after it has been transformed. A generated alert will be transformed by the connector so that
 * it matches this structure. User attached alerts do not need to be transformed.
 */
export const AlertCommentRequestSchema = z.strictObject({
  type: z.literal(CommentType.alert),
  alertId: z.union([z.array(z.string()), z.string()]),
  index: z.union([z.array(z.string()), z.string()]),
  rule: z.strictObject({
    id: z.nullable(z.string()),
    name: z.nullable(z.string()),
  }),
  owner: z.string(),
});

export const ActionsCommentRequestSchema = z.strictObject({
  type: z.literal(CommentType.actions),
  comment: z.string(),
  actions: z.strictObject({
    targets: z.array(
      z.strictObject({
        hostname: z.string(),
        endpointId: z.string(),
      })
    ),
    type: z.string(),
  }),
  owner: z.string(),
});

export enum ExternalReferenceStorageType {
  savedObject = 'savedObject',
  elasticSearchDoc = 'elasticSearchDoc',
}

const ExternalReferenceBaseSchema = z.strictObject({
  externalReferenceAttachmentTypeId: z.string(),
  externalReferenceMetadata: z.nullable(z.record(z.string(), jsonSchema)),
  type: z.literal(CommentType.externalReference),
  owner: z.string(),
});

export const ExternalReferenceSchema = z
  .strictObject({
    externalReferenceId: z.string(),
    externalReferenceStorage: z.discriminatedUnion('type', [
      z.strictObject({
        type: z.literal(ExternalReferenceStorageType.elasticSearchDoc),
      }),
      z.strictObject({
        type: z.literal(ExternalReferenceStorageType.savedObject),
        soType: z.string(),
      }),
    ]),
  })
  .merge(ExternalReferenceBaseSchema);

const ExternalReferenceWithoutRefsSchema = z.union([
  z
    .strictObject({
      externalReferenceId: z.string(),
      externalReferenceStorage: z.strictObject({
        type: z.literal(ExternalReferenceStorageType.elasticSearchDoc),
      }),
    })
    .merge(ExternalReferenceBaseSchema),
  // The difference between the two is that the following object doesn't have the externalReferenceId
  z
    .strictObject({
      externalReferenceStorage: z.strictObject({
        type: z.literal(ExternalReferenceStorageType.savedObject),
        soType: z.string(),
      }),
    })
    .merge(ExternalReferenceBaseSchema),
]);

const PersistableStateAttachmentSchema = z.strictObject({
  type: z.literal(CommentType.persistableState),
  owner: z.string(),
  persistableStateAttachmentTypeId: z.string(),
  persistableStateAttachmentState: z.record(z.string(), jsonSchema),
});

const AttributesTypeUserSchema = ContextTypeUserSchema.merge(CommentAttributesBasicSchema);
const AttributesTypeAlertsSchema = AlertCommentRequestSchema.merge(CommentAttributesBasicSchema);
const AttributesTypeActionsSchema = ActionsCommentRequestSchema.merge(CommentAttributesBasicSchema);
const AttributesTypeExternalReferenceSchema = ExternalReferenceSchema.merge(
  CommentAttributesBasicSchema
);
const AttributesTypePersistableStateSchema = PersistableStateAttachmentSchema.merge(
  CommentAttributesBasicSchema
);

const CommentAttributesSchema = z
  .discriminatedUnion('type', [
    AttributesTypeUserSchema,
    AttributesTypeAlertsSchema,
    AttributesTypeActionsSchema,
    AttributesTypeExternalReferenceSchema,
    AttributesTypePersistableStateSchema,
  ])
  .superRefine(alertIdIndexValidation);

const CommentAttributesWithoutRefsSchema = z
  .union([
    AttributesTypeUserSchema,
    AttributesTypeAlertsSchema,
    AttributesTypeActionsSchema,
    ExternalReferenceWithoutRefsSchema,
    AttributesTypePersistableStateSchema,
  ])
  .superRefine(alertIdIndexValidation);

export const CommentRequestSchema = z
  .discriminatedUnion('type', [
    ContextTypeUserSchema,
    AlertCommentRequestSchema,
    ActionsCommentRequestSchema,
    ExternalReferenceSchema,
    PersistableStateAttachmentSchema,
  ])
  .superRefine(alertIdIndexValidation);

const IDName = z.strictObject({
  id: z.string(),
  version: z.string(),
});

const CommentResponseSchema = z
  .discriminatedUnion('type', [
    AttributesTypeUserSchema.merge(IDName),
    AttributesTypeAlertsSchema.merge(IDName),
    AttributesTypeActionsSchema.merge(IDName),
    AttributesTypeExternalReferenceSchema.merge(IDName),
    AttributesTypePersistableStateSchema.merge(IDName),
  ])
  .superRefine(alertIdIndexValidation);

const CommentResponseTypeUserSchema = AttributesTypeUserSchema.merge(IDName);
const CommentResponseTypeAlertsSchema =
  AttributesTypeAlertsSchema.merge(IDName).superRefine(alertIdIndexValidation);
const CommentResponseTypeActionsSchema = AttributesTypeActionsSchema.merge(IDName);
const CommentResponseTypeExternalReferenceSchema =
  AttributesTypeExternalReferenceSchema.merge(IDName);
const CommentResponseTypePersistableStateSchema =
  AttributesTypePersistableStateSchema.merge(IDName);

/**
 * Partial updates are not allowed.
 * We want to prevent the user for changing the type without removing invalid fields.
 *
 * injectAttachmentSOAttributesFromRefsForPatch is dependent on this assumption.
 * The consumers of the persistable attachment service should always get the
 * persistableStateAttachmentState on a patch.
 */
export const CommentPatchRequestSchema = z
  .discriminatedUnion('type', [
    ContextTypeUserSchema.merge(IDName),
    AlertCommentRequestSchema.merge(IDName),
    ActionsCommentRequestSchema.merge(IDName),
    ExternalReferenceSchema.merge(IDName),
    PersistableStateAttachmentSchema.merge(IDName),
  ])
  .superRefine(alertIdIndexValidation);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
const CommentPatchAttributesSchema = z.union([
  AttributesTypeUserSchema.deepPartial(),
  AttributesTypeAlertsSchema.deepPartial(),
  AttributesTypeActionsSchema.deepPartial(),
  AttributesTypeExternalReferenceSchema.deepPartial(),
  AttributesTypePersistableStateSchema.deepPartial(),
]);

const CommentsResponseSchema = z.strictObject({
  comments: z.array(CommentResponseSchema),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

const AllCommentsResponseSchema = z.array(CommentResponseSchema);

export const FindQueryParamsSchema = SavedObjectFindOptionsSchema.partial();

export const BulkCreateCommentRequestSchema = z.array(CommentRequestSchema);

export type FindQueryParams = z.infer<typeof FindQueryParamsSchema>;
export type AttributesTypeActions = z.infer<typeof AttributesTypeActionsSchema>;
export type AttributesTypeAlerts = z.infer<typeof AttributesTypeAlertsSchema>;
export type AttributesTypeUser = z.infer<typeof AttributesTypeUserSchema>;
export type AttributesTypeExternalReference = z.infer<typeof AttributesTypeExternalReferenceSchema>;
export type AttributesTypeExternalReferenceSO = z.infer<
  typeof AttributesTypeExternalReferenceSOSchema
>;
export type AttributesTypeExternalReferenceNoSO = z.infer<
  typeof AttributesTypeExternalReferenceNoSOSchema
>;
export type AttributesTypePersistableState = z.infer<typeof AttributesTypePersistableStateSchema>;
export type CommentAttributes = z.infer<typeof CommentAttributesSchema>;
export type CommentAttributesWithoutRefs = z.infer<typeof CommentAttributesWithoutRefsSchema>;
export type CommentRequest = z.infer<typeof CommentRequestSchema>;
export type BulkCreateCommentRequest = z.infer<typeof BulkCreateCommentRequestSchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
export type CommentResponseUserType = z.infer<typeof CommentResponseTypeUserSchema>;
export type CommentResponseAlertsType = z.infer<typeof CommentResponseTypeAlertsSchema>;
export type CommentResponseTypePersistableState = z.infer<
  typeof CommentResponseTypePersistableStateSchema
>;
export type CommentResponseExternalReferenceType = z.infer<
  typeof CommentResponseTypeExternalReferenceSchema
>;
export type CommentResponseActionsType = z.infer<typeof CommentResponseTypeActionsSchema>;
export type AllCommentsResponse = z.infer<typeof AllCommentsResponseSchema>;
export type CommentsResponse = z.infer<typeof CommentsResponseSchema>;
export type CommentPatchRequest = z.infer<typeof CommentPatchRequestSchema>;
export type CommentPatchAttributes = z.infer<typeof CommentPatchAttributesSchema>;
export type CommentRequestUserType = z.infer<typeof ContextTypeUserSchema>;
export type CommentRequestAlertType = z.infer<typeof AlertCommentRequestSchema>;
export type CommentRequestActionsType = z.infer<typeof ActionsCommentRequestSchema>;
export type CommentRequestExternalReferenceType = z.infer<typeof ExternalReferenceSchema>;
export type CommentRequestExternalReferenceSOType = z.infer<typeof ExternalReferenceSOSchema>;
export type CommentRequestExternalReferenceNoSOType = z.infer<typeof ExternalReferenceNoSOSchema>;
export type CommentRequestPersistableStateType = z.infer<typeof PersistableStateAttachmentSchema>;
