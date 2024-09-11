/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_ASSIGNEES_FILTER_LENGTH,
  MAX_CASES_PER_PAGE,
  MAX_DELETE_IDS_LENGTH,
  MAX_REPORTERS_FILTER_LENGTH,
  MAX_TAGS_FILTER_LENGTH,
  MAX_CASES_TO_UPDATE,
  MAX_BULK_GET_CASES,
  MAX_CATEGORY_FILTER_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CUSTOM_FIELDS_PER_CASE,
} from '../../../constants';
import {
  limitedStringSchema,
  limitedArraySchema,
  NonEmptyString,
  paginationSchema,
} from '../../../schema';
import { CaseCustomFieldToggleRt, CustomFieldTextTypeRt } from '../../domain';
import {
  CaseRt,
  CaseSettingsRt,
  CaseSeverityRt,
  CasesRt,
  CaseStatusRt,
  RelatedCaseRt,
} from '../../domain/case/v1';
import { CaseConnectorRt } from '../../domain/connector/v1';
import { CaseUserProfileRt, UserRt } from '../../domain/user/v1';
import { CasesStatusResponseRt } from '../stats/v1';
import { CaseCustomFieldTextWithValidationValueRt } from '../custom_field/v1';

const CaseCustomFieldTextWithValidationRt = rt.strict({
  key: rt.string,
  type: CustomFieldTextTypeRt,
  value: rt.union([CaseCustomFieldTextWithValidationValueRt('value'), rt.null]),
});

const CustomFieldRt = rt.union([CaseCustomFieldTextWithValidationRt, CaseCustomFieldToggleRt]);

export const CaseRequestCustomFieldsRt = limitedArraySchema({
  codec: CustomFieldRt,
  fieldName: 'customFields',
  min: 0,
  max: MAX_CUSTOM_FIELDS_PER_CASE,
});

export const CaseBaseOptionalFieldsRequestRt = rt.exact(
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
     * The severity of the case
     */
    severity: CaseSeverityRt,
    /**
     * The users assigned to this case
     */
    assignees: limitedArraySchema({
      codec: CaseUserProfileRt,
      fieldName: 'assignees',
      min: 0,
      max: MAX_ASSIGNEES_PER_CASE,
    }),
    /**
     * The category of the case.
     */
    category: rt.union([
      limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
      rt.null,
    ]),
    /**
     * Custom fields of the case
     */
    customFields: CaseRequestCustomFieldsRt,
    /**
     * The alert sync settings
     */
    settings: CaseSettingsRt,
  })
);

export const CaseRequestFieldsRt = rt.intersection([
  CaseBaseOptionalFieldsRequestRt,
  rt.exact(
    rt.partial({
      /**
       * The current status of the case (open, closed, in-progress)
       */
      status: CaseStatusRt,

      /**
       * The plugin owner of the case
       */
      owner: rt.string,
    })
  ),
]);

/**
 * Create case
 */
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
    settings: CaseSettingsRt,
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
      assignees: limitedArraySchema({
        codec: CaseUserProfileRt,
        fieldName: 'assignees',
        min: 0,
        max: MAX_ASSIGNEES_PER_CASE,
      }),
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
      /**
       * The list of custom field values of the case.
       */
      customFields: CaseRequestCustomFieldsRt,
    })
  ),
]);

/**
 * Bulk create cases
 */

const CaseCreateRequestWithOptionalId = rt.intersection([
  CasePostRequestRt,
  rt.exact(rt.partial({ id: rt.string })),
]);

export const BulkCreateCasesRequestRt = rt.strict({
  cases: rt.array(CaseCreateRequestWithOptionalId),
});

export const BulkCreateCasesResponseRt = rt.strict({
  cases: rt.array(CaseRt),
});

/**
 * Find cases
 */

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
      status: rt.union([CaseStatusRt, rt.array(CaseStatusRt)]),
      /**
       * The severity of the case
       */
      severity: rt.union([CaseSeverityRt, rt.array(CaseSeverityRt)]),
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
      category: rt.union([
        limitedArraySchema({
          codec: rt.string,
          fieldName: 'category',
          min: 0,
          max: MAX_CATEGORY_FILTER_LENGTH,
        }),
        rt.string,
      ]),
    })
  ),
  paginationSchema({ maxPerPage: MAX_CASES_PER_PAGE }),
]);

export const CasesSearchRequestRt = rt.intersection([
  rt.exact(
    rt.partial({
      /**
       * custom fields of the case
       */
      customFields: rt.record(
        rt.string,
        rt.array(rt.union([rt.string, rt.boolean, rt.number, rt.null]))
      ),
    })
  ),
  CasesFindRequestRt,
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

/**
 * Delete cases
 */

export const CasesDeleteRequestRt = limitedArraySchema({
  codec: NonEmptyString,
  min: 1,
  max: MAX_DELETE_IDS_LENGTH,
  fieldName: 'ids',
});

/**
 * Resolve case
 */

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

/**
 * Get cases
 */
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

/**
 * Update cases
 */
export const CasePatchRequestRt = rt.intersection([
  CaseRequestFieldsRt,
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

/**
 * Push case
 */

export const CasePushRequestParamsRt = rt.strict({
  case_id: rt.string,
  connector_id: rt.string,
});

/**
 * Taxonomies
 */

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

/**
 * Alerts
 */

export const CasesByAlertIDRequestRt = rt.exact(
  rt.partial({
    /**
     * The type of cases to retrieve given an alert ID. If no owner is provided, all cases
     * that the user has access to will be returned.
     */
    owner: rt.union([rt.array(rt.string), rt.string]),
  })
);

export const GetRelatedCasesByAlertResponseRt = rt.array(RelatedCaseRt);

export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type CaseResolveResponse = rt.TypeOf<typeof CaseResolveResponseRt>;
export type CasesDeleteRequest = rt.TypeOf<typeof CasesDeleteRequestRt>;
export type CasesByAlertIDRequest = rt.TypeOf<typeof CasesByAlertIDRequestRt>;
export type CasesFindRequest = rt.TypeOf<typeof CasesFindRequestRt>;
export type CasesSearchRequest = rt.TypeOf<typeof CasesSearchRequestRt>;
export type CasesFindRequestSortFields = rt.TypeOf<typeof CasesFindRequestSortFieldsRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type AllTagsFindRequest = rt.TypeOf<typeof AllTagsFindRequestRt>;
export type GetTagsResponse = rt.TypeOf<typeof GetTagsResponseRt>;
export type AllCategoriesFindRequest = rt.TypeOf<typeof AllCategoriesFindRequestRt>;
export type GetCategoriesResponse = rt.TypeOf<typeof GetCategoriesResponseRt>;
export type AllReportersFindRequest = AllTagsFindRequest;
export type GetReportersResponse = rt.TypeOf<typeof GetReportersResponseRt>;
export type CasesBulkGetRequest = rt.TypeOf<typeof CasesBulkGetRequestRt>;
export type CasesBulkGetResponse = rt.TypeOf<typeof CasesBulkGetResponseRt>;
export type GetRelatedCasesByAlertResponse = rt.TypeOf<typeof GetRelatedCasesByAlertResponseRt>;
export type CaseRequestCustomFields = rt.TypeOf<typeof CaseRequestCustomFieldsRt>;
export type CaseRequestCustomField = rt.TypeOf<typeof CustomFieldRt>;
export type BulkCreateCasesRequest = rt.TypeOf<typeof BulkCreateCasesRequestRt>;
export type BulkCreateCasesResponse = rt.TypeOf<typeof BulkCreateCasesResponseRt>;
