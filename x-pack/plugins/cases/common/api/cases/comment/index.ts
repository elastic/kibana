/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_BULK_GET_ATTACHMENTS,
  MAX_COMMENTS_PER_PAGE,
  MAX_COMMENT_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
} from '../../../constants';
import { limitedArraySchema, paginationSchema, limitedStringSchema } from '../../../schema';
import { jsonValueRt } from '../../runtime_types';

import { UserRt } from '../../user';

export * from './files';

export const CommentAttributesBasicRt = rt.strict({
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

export const ContextTypeUserRt = rt.strict({
  comment: rt.string,
  type: rt.literal(CommentType.user),
  owner: rt.string,
});

/**
 * This defines the structure of how alerts (generated or user attached) are stored in saved objects documents. It also
 * represents of an alert after it has been transformed. A generated alert will be transformed by the connector so that
 * it matches this structure. User attached alerts do not need to be transformed.
 */
export const AlertCommentRequestRt = rt.strict({
  type: rt.literal(CommentType.alert),
  alertId: rt.union([rt.array(rt.string), rt.string]),
  index: rt.union([rt.array(rt.string), rt.string]),
  rule: rt.strict({
    id: rt.union([rt.string, rt.null]),
    name: rt.union([rt.string, rt.null]),
  }),
  owner: rt.string,
});

export const ActionsCommentRequestRt = rt.strict({
  type: rt.literal(CommentType.actions),
  comment: rt.string,
  actions: rt.strict({
    targets: rt.array(
      rt.strict({
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

const ExternalReferenceStorageNoSORt = rt.strict({
  type: rt.literal(ExternalReferenceStorageType.elasticSearchDoc),
});

const ExternalReferenceStorageSORt = rt.strict({
  type: rt.literal(ExternalReferenceStorageType.savedObject),
  soType: rt.string,
});

export const ExternalReferenceBaseRt = rt.strict({
  externalReferenceAttachmentTypeId: rt.string,
  externalReferenceMetadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
  type: rt.literal(CommentType.externalReference),
  owner: rt.string,
});

export const ExternalReferenceNoSORt = rt.strict({
  ...ExternalReferenceBaseRt.type.props,
  externalReferenceId: rt.string,
  externalReferenceStorage: ExternalReferenceStorageNoSORt,
});

export const ExternalReferenceSORt = rt.strict({
  ...ExternalReferenceBaseRt.type.props,
  externalReferenceId: rt.string,
  externalReferenceStorage: ExternalReferenceStorageSORt,
});

// externalReferenceId is missing.
export const ExternalReferenceSOWithoutRefsRt = rt.strict({
  ...ExternalReferenceBaseRt.type.props,
  externalReferenceStorage: ExternalReferenceStorageSORt,
});

export const ExternalReferenceRt = rt.union([ExternalReferenceNoSORt, ExternalReferenceSORt]);
export const ExternalReferenceWithoutRefsRt = rt.union([
  ExternalReferenceNoSORt,
  ExternalReferenceSOWithoutRefsRt,
]);

export const PersistableStateAttachmentRt = rt.strict({
  type: rt.literal(CommentType.persistableState),
  owner: rt.string,
  persistableStateAttachmentTypeId: rt.string,
  persistableStateAttachmentState: rt.record(rt.string, jsonValueRt),
});

const AttributesTypeUserRt = rt.intersection([ContextTypeUserRt, CommentAttributesBasicRt]);
export const AttributesTypeAlertsRt = rt.intersection([
  AlertCommentRequestRt,
  CommentAttributesBasicRt,
]);
const AttributesTypeActionsRt = rt.intersection([
  ActionsCommentRequestRt,
  CommentAttributesBasicRt,
]);

const AttributesTypeExternalReferenceRt = rt.intersection([
  ExternalReferenceRt,
  CommentAttributesBasicRt,
]);

const AttributesTypeExternalReferenceWithoutRefsRt = rt.intersection([
  ExternalReferenceWithoutRefsRt,
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

export const CommentAttributesRt = rt.union([
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
  AttributesTypeExternalReferenceWithoutRefsRt,
  AttributesTypePersistableStateRt,
]);

const BasicCommentRequestRt = rt.union([
  ContextTypeUserRt,
  AlertCommentRequestRt,
  ActionsCommentRequestRt,
  ExternalReferenceNoSORt,
  PersistableStateAttachmentRt,
]);

export const CommentRequestRt = rt.union([
  rt.strict({
    comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
    type: rt.literal(CommentType.user),
    owner: rt.string,
  }),
  AlertCommentRequestRt,
  rt.strict({
    type: rt.literal(CommentType.actions),
    comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
    actions: rt.strict({
      targets: rt.array(
        rt.strict({
          hostname: rt.string,
          endpointId: rt.string,
        })
      ),
      type: rt.string,
    }),
    owner: rt.string,
  }),
  ExternalReferenceNoSORt,
  ExternalReferenceSORt,
  PersistableStateAttachmentRt,
]);

export const CommentRequestWithoutRefsRt = rt.union([
  BasicCommentRequestRt,
  ExternalReferenceSOWithoutRefsRt,
]);

export const CommentRt = rt.intersection([
  CommentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeUserRt = rt.intersection([
  AttributesTypeUserRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeAlertsRt = rt.intersection([
  AttributesTypeAlertsRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeActionsRt = rt.intersection([
  AttributesTypeActionsRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeExternalReferenceRt = rt.intersection([
  AttributesTypeExternalReferenceRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypePersistableStateRt = rt.intersection([
  AttributesTypePersistableStateRt,
  rt.strict({
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
  rt.strict({ id: rt.string, version: rt.string }),
]);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export const CommentPatchAttributesRt = rt.intersection([
  rt.union([
    rt.exact(rt.partial(ContextTypeUserRt.type.props)),
    rt.exact(rt.partial(AlertCommentRequestRt.type.props)),
    rt.exact(rt.partial(ActionsCommentRequestRt.type.props)),
    rt.exact(rt.partial(ExternalReferenceNoSORt.type.props)),
    rt.exact(rt.partial(ExternalReferenceSORt.type.props)),
    rt.exact(rt.partial(PersistableStateAttachmentRt.type.props)),
  ]),
  rt.exact(rt.partial(CommentAttributesBasicRt.type.props)),
]);

export const CommentsFindResponseRt = rt.strict({
  comments: rt.array(CommentRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const CommentsRt = rt.array(CommentRt);

export const FindCommentsQueryParamsRt = rt.intersection([
  rt.exact(
    rt.partial({
      /**
       * Order to sort the response
       */
      sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
    })
  ),
  paginationSchema({ maxPerPage: MAX_COMMENTS_PER_PAGE }),
]);

export const BulkCreateCommentRequestRt = limitedArraySchema({
  codec: CommentRequestRt,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export const BulkGetAttachmentsRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: rt.string,
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export const BulkGetAttachmentsResponseRt = rt.strict({
  attachments: CommentsRt,
  errors: rt.array(
    rt.strict({
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
export type ExternalReferenceWithoutRefs = rt.TypeOf<typeof ExternalReferenceWithoutRefsRt>;
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
