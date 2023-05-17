/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { jsonValueRt } from '../../runtime_types';
import { NumberFromString } from '../../saved_object';

import { UserRt } from '../../user';

export * from './files';

export const CommentAttributesBasicRt = rt.type({
  created_at: rt.string,
  created_by: UserRt,
  owner: rt.string,
  pushed_at: rt.union([rt.string, rt.null]),
  pushed_by: rt.union([UserRt, rt.null]),
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRt, rt.null]),
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

export const ContextTypeUserRt = rt.type({
  comment: rt.string,
  type: rt.literal(CommentType.user),
  owner: rt.string,
});

/**
 * This defines the structure of how alerts (generated or user attached) are stored in saved objects documents. It also
 * represents of an alert after it has been transformed. A generated alert will be transformed by the connector so that
 * it matches this structure. User attached alerts do not need to be transformed.
 */
export const AlertCommentRequestRt = rt.type({
  type: rt.literal(CommentType.alert),
  alertId: rt.union([rt.array(rt.string), rt.string]),
  index: rt.union([rt.array(rt.string), rt.string]),
  rule: rt.type({
    id: rt.union([rt.string, rt.null]),
    name: rt.union([rt.string, rt.null]),
  }),
  owner: rt.string,
});

export const ActionsCommentRequestRt = rt.type({
  type: rt.literal(CommentType.actions),
  comment: rt.string,
  actions: rt.type({
    targets: rt.array(
      rt.type({
        hostname: rt.string,
        endpointId: rt.string,
      })
    ),
    type: rt.string,
  }),
  owner: rt.string,
});

export enum ExternalReferenceStorageType {
  savedObject = 'savedObject',
  elasticSearchDoc = 'elasticSearchDoc',
}

const ExternalReferenceStorageNoSORt = rt.type({
  type: rt.literal(ExternalReferenceStorageType.elasticSearchDoc),
});

const ExternalReferenceStorageSORt = rt.type({
  type: rt.literal(ExternalReferenceStorageType.savedObject),
  soType: rt.string,
});

export const ExternalReferenceBaseRt = rt.type({
  externalReferenceAttachmentTypeId: rt.string,
  externalReferenceMetadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
  type: rt.literal(CommentType.externalReference),
  owner: rt.string,
});

export const ExternalReferenceNoSORt = rt.type({
  ...ExternalReferenceBaseRt.props,
  externalReferenceId: rt.string,
  externalReferenceStorage: ExternalReferenceStorageNoSORt,
});

export const ExternalReferenceSORt = rt.type({
  ...ExternalReferenceBaseRt.props,
  externalReferenceId: rt.string,
  externalReferenceStorage: ExternalReferenceStorageSORt,
});

// externalReferenceId is missing.
export const ExternalReferenceSOWithoutRefsRt = rt.type({
  ...ExternalReferenceBaseRt.props,
  externalReferenceStorage: ExternalReferenceStorageSORt,
});

export const ExternalReferenceRt = rt.union([ExternalReferenceNoSORt, ExternalReferenceSORt]);
export const ExternalReferenceWithoutRefsRt = rt.union([
  ExternalReferenceNoSORt,
  ExternalReferenceSOWithoutRefsRt,
]);

export const PersistableStateAttachmentRt = rt.type({
  type: rt.literal(CommentType.persistableState),
  owner: rt.string,
  persistableStateAttachmentTypeId: rt.string,
  persistableStateAttachmentState: rt.record(rt.string, jsonValueRt),
});

const AttributesTypeUserRt = rt.intersection([ContextTypeUserRt, CommentAttributesBasicRt]);
const AttributesTypeAlertsRt = rt.intersection([AlertCommentRequestRt, CommentAttributesBasicRt]);
const AttributesTypeActionsRt = rt.intersection([
  ActionsCommentRequestRt,
  CommentAttributesBasicRt,
]);

const AttributesTypeExternalReferenceRt = rt.intersection([
  ExternalReferenceRt,
  CommentAttributesBasicRt,
]);

const AttributesTypeExternalReferenceNoSORt = rt.intersection([
  ExternalReferenceNoSORt,
  CommentAttributesBasicRt,
]);

const AttributesTypeExternalReferenceSORt = rt.intersection([
  ExternalReferenceSORt,
  CommentAttributesBasicRt,
]);

const AttributesTypePersistableStateRt = rt.intersection([
  PersistableStateAttachmentRt,
  CommentAttributesBasicRt,
]);

const CommentAttributesRt = rt.union([
  AttributesTypeUserRt,
  AttributesTypeAlertsRt,
  AttributesTypeActionsRt,
  AttributesTypeExternalReferenceRt,
  AttributesTypePersistableStateRt,
]);

const CommentAttributesNoSORt = rt.union([
  AttributesTypeUserRt,
  AttributesTypeAlertsRt,
  AttributesTypeActionsRt,
  AttributesTypeExternalReferenceNoSORt,
  AttributesTypePersistableStateRt,
]);

const CommentAttributesWithoutRefsRt = rt.union([
  AttributesTypeUserRt,
  AttributesTypeAlertsRt,
  AttributesTypeActionsRt,
  ExternalReferenceWithoutRefsRt,
  AttributesTypePersistableStateRt,
]);

export const CommentRequestRt = rt.union([
  ContextTypeUserRt,
  AlertCommentRequestRt,
  ActionsCommentRequestRt,
  ExternalReferenceNoSORt,
  ExternalReferenceSORt,
  PersistableStateAttachmentRt,
]);

export const CommentRt = rt.intersection([
  CommentAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeUserRt = rt.intersection([
  AttributesTypeUserRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeAlertsRt = rt.intersection([
  AttributesTypeAlertsRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeActionsRt = rt.intersection([
  AttributesTypeActionsRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeExternalReferenceRt = rt.intersection([
  AttributesTypeExternalReferenceRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypePersistableStateRt = rt.intersection([
  AttributesTypePersistableStateRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentPatchRequestRt = rt.intersection([
  /**
   * Partial updates are not allowed.
   * We want to prevent the user for changing the type without removing invalid fields.
   *
   * injectAttachmentSOAttributesFromRefsForPatch is dependent on this assumption.
   * The consumers of the persistable attachment service should always get the
   * persistableStateAttachmentState on a patch.
   */
  CommentRequestRt,
  rt.type({ id: rt.string, version: rt.string }),
]);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export const CommentPatchAttributesRt = rt.intersection([
  rt.union([
    rt.partial(ContextTypeUserRt.props),
    rt.partial(AlertCommentRequestRt.props),
    rt.partial(ActionsCommentRequestRt.props),
    rt.partial(ExternalReferenceNoSORt.props),
    rt.partial(ExternalReferenceSORt.props),
    rt.partial(PersistableStateAttachmentRt.props),
  ]),
  rt.partial(CommentAttributesBasicRt.props),
]);

export const CommentsFindResponseRt = rt.type({
  comments: rt.array(CommentRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const CommentsRt = rt.array(CommentRt);

export const FindCommentsQueryParamsRt = rt.partial({
  /**
   * The page of objects to return
   */
  page: rt.union([rt.number, NumberFromString]),
  /**
   * The number of objects to return for a page
   */
  perPage: rt.union([rt.number, NumberFromString]),
  /**
   * Order to sort the response
   */
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
});

export const FindCommentsArgsRt = rt.intersection([
  rt.type({
    caseID: rt.string,
  }),
  rt.type({ queryParams: rt.union([FindCommentsQueryParamsRt, rt.undefined]) }),
]);

export const BulkCreateCommentRequestRt = rt.array(CommentRequestRt);

export const BulkGetAttachmentsRequestRt = rt.type({
  ids: rt.array(rt.string),
});

export const BulkGetAttachmentsResponseRt = rt.type({
  attachments: CommentsRt,
  errors: rt.array(
    rt.type({
      error: rt.string,
      message: rt.string,
      status: rt.union([rt.undefined, rt.number]),
      attachmentId: rt.string,
    })
  ),
});

export type FindCommentsQueryParams = rt.TypeOf<typeof FindCommentsQueryParamsRt>;
export type AttributesTypeActions = rt.TypeOf<typeof AttributesTypeActionsRt>;
export type AttributesTypeAlerts = rt.TypeOf<typeof AttributesTypeAlertsRt>;
export type AttributesTypeUser = rt.TypeOf<typeof AttributesTypeUserRt>;
export type AttributesTypeExternalReference = rt.TypeOf<typeof AttributesTypeExternalReferenceRt>;
export type AttributesTypeExternalReferenceSO = rt.TypeOf<
  typeof AttributesTypeExternalReferenceSORt
>;
export type AttributesTypeExternalReferenceNoSO = rt.TypeOf<
  typeof AttributesTypeExternalReferenceNoSORt
>;
export type AttributesTypePersistableState = rt.TypeOf<typeof AttributesTypePersistableStateRt>;
export type CommentAttributes = rt.TypeOf<typeof CommentAttributesRt>;
export type CommentAttributesNoSO = rt.TypeOf<typeof CommentAttributesNoSORt>;
export type CommentAttributesWithoutRefs = rt.TypeOf<typeof CommentAttributesWithoutRefsRt>;
export type CommentRequest = rt.TypeOf<typeof CommentRequestRt>;
export type BulkCreateCommentRequest = rt.TypeOf<typeof BulkCreateCommentRequestRt>;
export type Comment = rt.TypeOf<typeof CommentRt>;
export type CommentResponseUserType = rt.TypeOf<typeof CommentResponseTypeUserRt>;
export type CommentResponseAlertsType = rt.TypeOf<typeof CommentResponseTypeAlertsRt>;
export type CommentResponseTypePersistableState = rt.TypeOf<
  typeof CommentResponseTypePersistableStateRt
>;
export type CommentResponseExternalReferenceType = rt.TypeOf<
  typeof CommentResponseTypeExternalReferenceRt
>;
export type CommentResponseActionsType = rt.TypeOf<typeof CommentResponseTypeActionsRt>;
export type Comments = rt.TypeOf<typeof CommentsRt>;
export type CommentsFindResponse = rt.TypeOf<typeof CommentsFindResponseRt>;
export type CommentPatchRequest = rt.TypeOf<typeof CommentPatchRequestRt>;
export type CommentPatchAttributes = rt.TypeOf<typeof CommentPatchAttributesRt>;
export type CommentRequestUserType = rt.TypeOf<typeof ContextTypeUserRt>;
export type CommentRequestAlertType = rt.TypeOf<typeof AlertCommentRequestRt>;
export type CommentRequestActionsType = rt.TypeOf<typeof ActionsCommentRequestRt>;
export type CommentRequestExternalReferenceType = rt.TypeOf<typeof ExternalReferenceRt>;
export type CommentRequestExternalReferenceSOType = rt.TypeOf<typeof ExternalReferenceSORt>;
export type CommentRequestExternalReferenceNoSOType = rt.TypeOf<typeof ExternalReferenceNoSORt>;
export type CommentRequestPersistableStateType = rt.TypeOf<typeof PersistableStateAttachmentRt>;
export type BulkGetAttachmentsResponse = rt.TypeOf<typeof BulkGetAttachmentsResponseRt>;
export type BulkGetAttachmentsRequest = rt.TypeOf<typeof BulkGetAttachmentsRequestRt>;
