/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { UserRt } from '../user';
import { CommentRt } from './comment';
import { CasesStatusResponseRt, CaseStatusRt } from './status';
import { CaseAssigneesRt } from './assignee';
import {
  limitedArraySchema,
  limitedStringSchema,
  NonEmptyString,
  paginationSchema,
} from '../../schema';
import {
  MAX_DELETE_IDS_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_CATEGORY_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_ASSIGNEES_FILTER_LENGTH,
  MAX_REPORTERS_FILTER_LENGTH,
  MAX_TAGS_FILTER_LENGTH,
  MAX_CASES_TO_UPDATE,
  MAX_BULK_GET_CASES,
  MAX_CASES_PER_PAGE,
} from '../../constants';
import { CaseConnectorRt } from '../../types/domain/connector/v1';

export const AttachmentTotalsRt = rt.strict({
  alerts: rt.number,
  userComments: rt.number,
});

export const RelatedCaseInfoRt = rt.strict({
  id: rt.string,
  title: rt.string,
  description: rt.string,
  status: CaseStatusRt,
  createdAt: rt.string,
  totals: AttachmentTotalsRt,
});

export const CasesByAlertIdRt = rt.array(RelatedCaseInfoRt);

export const SettingsRt = rt.strict({
  syncAlerts: rt.boolean,
});

export enum CaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const CaseSeverityRt = rt.union([
  rt.literal(CaseSeverity.LOW),
  rt.literal(CaseSeverity.MEDIUM),
  rt.literal(CaseSeverity.HIGH),
  rt.literal(CaseSeverity.CRITICAL),
]);

const CaseBasicRt = rt.strict({
  /**
   * The description of the case
   */
  description: rt.string,
  /**
   * The current status of the case (open, closed, in-progress)
   */
  status: CaseStatusRt,
  /**
   * The identifying strings for filter a case
   */
  tags: rt.array(rt.string),
  /**
   * The title of a case
   */
  title: rt.string,
  /**
   * The external system that the case can be synced with
   */
  connector: CaseConnectorRt,
  /**
   * The alert sync settings
   */
  settings: SettingsRt,
  /**
   * The plugin owner of the case
   */
  owner: rt.string,
  /**
   * The severity of the case
   */
  severity: CaseSeverityRt,
  /**
   * The users assigned to this case
   */
  assignees: CaseAssigneesRt,
  /**
   * The category of the case.
   */
  category: rt.union([rt.string, rt.null]),
});

/**
 * This represents the push to service UserAction. It lacks the connector_id because that is stored in a different field
 * within the user action object in the API response.
 */
export const CaseUserActionExternalServiceRt = rt.strict({
  connector_name: rt.string,
  external_id: rt.string,
  external_title: rt.string,
  external_url: rt.string,
  pushed_at: rt.string,
  pushed_by: UserRt,
});

export const CaseExternalServiceBasicRt = rt.intersection([
  rt.strict({
    connector_id: rt.string,
  }),
  CaseUserActionExternalServiceRt,
]);

export const CaseFullExternalServiceRt = rt.union([CaseExternalServiceBasicRt, rt.null]);

export const CaseAttributesRt = rt.intersection([
  CaseBasicRt,
  rt.strict({
    duration: rt.union([rt.number, rt.null]),
    closed_at: rt.union([rt.string, rt.null]),
    closed_by: rt.union([UserRt, rt.null]),
    created_at: rt.string,
    created_by: UserRt,
    external_service: CaseFullExternalServiceRt,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRt, rt.null]),
  }),
]);

export const CasePostRequestRt = rt.intersection([
  rt.strict({
    /**
     * Description of the case
     */
    description: limitedStringSchema({
      fieldName: 'description',
      min: 1,
      max: MAX_DESCRIPTION_LENGTH,
    }),
    /**
     * Identifiers for the case.
     */
    tags: limitedArraySchema({
      codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
      fieldName: 'tags',
      min: 0,
      max: MAX_TAGS_PER_CASE,
    }),
    /**
     * Title of the case
     */
    title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }),
    /**
     * The external configuration for the case
     */
    connector: CaseConnectorRt,
    /**
     * Sync settings for alerts
     */
    settings: SettingsRt,
    /**
     * The owner here must match the string used when a plugin registers a feature with access to the cases plugin. The user
     * creating this case must also be granted access to that plugin's feature.
     */
    owner: rt.string,
  }),
  rt.exact(
    rt.partial({
      /**
       * The users assigned to the case
       */
      assignees: CaseAssigneesRt,
      /**
       * The severity of the case. The severity is
       * default it to "low" if not provided.
       */
      severity: CaseSeverityRt,
      /**
       * The category of the case.
       */
      category: rt.union([
        limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
        rt.null,
      ]),
    })
  ),
]);

export const CasesFindRequestSearchFieldsRt = rt.keyof({
  description: null,
  title: null,
});

export const CasesFindRequestSortFieldsRt = rt.keyof({
  title: null,
  category: null,
  createdAt: null,
  updatedAt: null,
  closedAt: null,
  status: null,
  severity: null,
});

export const CasesFindRequestRt = rt.intersection([
  rt.exact(
    rt.partial({
      /**
       * Tags to filter by
       */
      tags: rt.union([
        limitedArraySchema({
          codec: rt.string,
          fieldName: 'tags',
          min: 0,
          max: MAX_TAGS_FILTER_LENGTH,
        }),
        rt.string,
      ]),
      /**
       * The status of the case (open, closed, in-progress)
       */
      status: CaseStatusRt,
      /**
       * The severity of the case
       */
      severity: CaseSeverityRt,
      /**
       * The uids of the user profiles to filter by
       */
      assignees: rt.union([
        limitedArraySchema({
          codec: rt.string,
          fieldName: 'assignees',
          min: 0,
          max: MAX_ASSIGNEES_FILTER_LENGTH,
        }),
        rt.string,
      ]),
      /**
       * The reporters to filter by
       */
      reporters: rt.union([
        limitedArraySchema({
          codec: rt.string,
          fieldName: 'reporters',
          min: 0,
          max: MAX_REPORTERS_FILTER_LENGTH,
        }),
        rt.string,
      ]),
      /**
       * Operator to use for the `search` field
       */
      defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
      /**
       * A KQL date. If used all cases created after (gte) the from date will be returned
       */
      from: rt.string,
      /**
       * The page of objects to return
       */
      // page: rt.union([rt.number, NumberFromString]),
      /**
       * The number of objects to include in each page
       */
      // perPage: rt.union([rt.number, NumberFromString]),
      /**
       * An Elasticsearch simple_query_string
       */
      search: rt.string,
      /**
       * The fields to perform the simple_query_string parsed query against
       */
      searchFields: rt.union([
        rt.array(CasesFindRequestSearchFieldsRt),
        CasesFindRequestSearchFieldsRt,
      ]),
      /**
       * The field to use for sorting the found objects.
       *
       */
      sortField: CasesFindRequestSortFieldsRt,
      /**
       * The order to sort by
       */
      sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),

      /**
       * A KQL date. If used all cases created before (lte) the to date will be returned.
       */
      to: rt.string,
      /**
       * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
       * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
       * that the user has access to.
       */

      owner: rt.union([rt.array(rt.string), rt.string]),
      /**
       * The category of the case.
       */
      category: rt.union([rt.array(rt.string), rt.string]),
    })
  ),
  paginationSchema({ maxPerPage: MAX_CASES_PER_PAGE }),
]);

export const CasesDeleteRequestRt = limitedArraySchema({
  codec: NonEmptyString,
  min: 1,
  max: MAX_DELETE_IDS_LENGTH,
  fieldName: 'ids',
});

export const CasesByAlertIDRequestRt = rt.exact(
  rt.partial({
    /**
     * The type of cases to retrieve given an alert ID. If no owner is provided, all cases
     * that the user has access to will be returned.
     */
    owner: rt.union([rt.array(rt.string), rt.string]),
  })
);

export const CaseRt = rt.intersection([
  CaseAttributesRt,
  rt.strict({
    id: rt.string,
    totalComment: rt.number,
    totalAlerts: rt.number,
    version: rt.string,
  }),
  rt.exact(
    rt.partial({
      comments: rt.array(CommentRt),
    })
  ),
]);

export const CaseResolveResponseRt = rt.intersection([
  rt.strict({
    case: CaseRt,
    outcome: rt.union([rt.literal('exactMatch'), rt.literal('aliasMatch'), rt.literal('conflict')]),
  }),
  rt.exact(
    rt.partial({
      alias_target_id: rt.string,
      alias_purpose: rt.union([
        rt.literal('savedObjectConversion'),
        rt.literal('savedObjectImport'),
      ]),
    })
  ),
]);

export const CasesFindResponseRt = rt.intersection([
  rt.strict({
    cases: rt.array(CaseRt),
    page: rt.number,
    per_page: rt.number,
    total: rt.number,
  }),
  CasesStatusResponseRt,
]);

export const CasePatchRequestRt = rt.intersection([
  rt.exact(
    rt.partial({
      /**
       * The description of the case
       */
      description: limitedStringSchema({
        fieldName: 'description',
        min: 1,
        max: MAX_DESCRIPTION_LENGTH,
      }),
      /**
       * The current status of the case (open, closed, in-progress)
       */
      status: CaseStatusRt,
      /**
       * The identifying strings for filter a case
       */
      tags: limitedArraySchema({
        codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
        min: 0,
        max: MAX_TAGS_PER_CASE,
        fieldName: 'tags',
      }),
      /**
       * The title of a case
       */
      title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }),
      /**
       * The external system that the case can be synced with
       */
      connector: CaseConnectorRt,
      /**
       * The alert sync settings
       */
      settings: SettingsRt,
      /**
       * The plugin owner of the case
       */
      owner: rt.string,
      /**
       * The severity of the case
       */
      severity: CaseSeverityRt,
      /**
       * The users assigned to this case
       */
      assignees: CaseAssigneesRt,
      /**
       * The category of the case.
       */
      category: rt.union([
        limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
        rt.null,
      ]),
    })
  ),
  /**
   * The saved object ID and version
   */
  rt.strict({ id: rt.string, version: rt.string }),
]);

export const CasesPatchRequestRt = rt.strict({
  cases: limitedArraySchema({
    codec: CasePatchRequestRt,
    min: 1,
    max: MAX_CASES_TO_UPDATE,
    fieldName: 'cases',
  }),
});

export const CasesRt = rt.array(CaseRt);

export const CasePushRequestParamsRt = rt.strict({
  case_id: rt.string,
  connector_id: rt.string,
});

export const ExternalServiceResponseRt = rt.intersection([
  rt.strict({
    title: rt.string,
    id: rt.string,
    pushedDate: rt.string,
    url: rt.string,
  }),
  rt.exact(
    rt.partial({
      comments: rt.array(
        rt.intersection([
          rt.strict({
            commentId: rt.string,
            pushedDate: rt.string,
          }),
          rt.exact(rt.partial({ externalCommentId: rt.string })),
        ])
      ),
    })
  ),
]);

export const AllTagsFindRequestRt = rt.exact(
  rt.partial({
    /**
     * The owner of the cases to retrieve the tags from. If no owner is provided the tags from all cases
     * that the user has access to will be returned.
     */
    owner: rt.union([rt.array(rt.string), rt.string]),
  })
);

export const AllCategoriesFindRequestRt = rt.exact(
  rt.partial({
    /**
     * The owner of the cases to retrieve the categories from. If no owner is provided the categories
     * from all cases that the user has access to will be returned.
     */
    owner: rt.union([rt.array(rt.string), rt.string]),
  })
);

export const AllReportersFindRequestRt = AllTagsFindRequestRt;

export const GetTagsResponseRt = rt.array(rt.string);
export const GetCategoriesResponseRt = rt.array(rt.string);
export const GetReportersResponseRt = rt.array(UserRt);

export const CasesBulkGetRequestRt = rt.strict({
  ids: limitedArraySchema({ codec: rt.string, min: 1, max: MAX_BULK_GET_CASES, fieldName: 'ids' }),
});

export const CasesBulkGetResponseRt = rt.strict({
  cases: CasesRt,
  errors: rt.array(
    rt.strict({
      error: rt.string,
      message: rt.string,
      status: rt.union([rt.undefined, rt.number]),
      caseId: rt.string,
    })
  ),
});

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;

export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type Case = rt.TypeOf<typeof CaseRt>;
export type CaseResolveResponse = rt.TypeOf<typeof CaseResolveResponseRt>;
export type Cases = rt.TypeOf<typeof CasesRt>;
export type CasesDeleteRequest = rt.TypeOf<typeof CasesDeleteRequestRt>;
export type CasesByAlertIDRequest = rt.TypeOf<typeof CasesByAlertIDRequestRt>;
export type CasesFindRequest = rt.TypeOf<typeof CasesFindRequestRt>;
export type CasesFindRequestSortFields = rt.TypeOf<typeof CasesFindRequestSortFieldsRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type CaseFullExternalService = rt.TypeOf<typeof CaseFullExternalServiceRt>;
export type CaseSettings = rt.TypeOf<typeof SettingsRt>;
export type ExternalServiceResponse = rt.TypeOf<typeof ExternalServiceResponseRt>;
export type CaseExternalServiceBasic = rt.TypeOf<typeof CaseExternalServiceBasicRt>;

export type AllTagsFindRequest = rt.TypeOf<typeof AllTagsFindRequestRt>;
export type AllCategoriesFindRequest = rt.TypeOf<typeof AllCategoriesFindRequestRt>;
export type AllReportersFindRequest = AllTagsFindRequest;

export type AttachmentTotals = rt.TypeOf<typeof AttachmentTotalsRt>;
export type RelatedCaseInfo = rt.TypeOf<typeof RelatedCaseInfoRt>;
export type CasesByAlertId = rt.TypeOf<typeof CasesByAlertIdRt>;

export type CasesBulkGetRequest = rt.TypeOf<typeof CasesBulkGetRequestRt>;
export type CasesBulkGetResponse = rt.TypeOf<typeof CasesBulkGetResponseRt>;
