/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { get, isPlainObject, differenceWith, isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { validate as uuidValidate } from 'uuid';

import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { KueryNode } from '@kbn/es-query';

import { nodeBuilder, fromKueryExpression, escapeKuery } from '@kbn/es-query';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';

import type {
  CaseSeverity,
  CaseStatuses,
  CustomFieldsConfiguration,
  ExternalReferenceAttachmentPayload,
} from '../../common/types/domain';
import {
  ActionsAttachmentPayloadRt,
  AlertAttachmentPayloadRt,
  ExternalReferenceNoSOAttachmentPayloadRt,
  ExternalReferenceSOAttachmentPayloadRt,
  ExternalReferenceStorageType,
  PersistableStateAttachmentPayloadRt,
  UserCommentAttachmentPayloadRt,
} from '../../common/types/domain';
import type { SavedObjectFindOptionsKueryNode } from '../common/types';
import type { CasesSearchParams } from './types';

import { decodeWithExcessOrThrow } from '../common/runtime_types';
import {
  CASE_SAVED_OBJECT,
  NO_ASSIGNEES_FILTERING_KEYWORD,
  OWNER_FIELD,
} from '../../common/constants';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from '../../common/utils/attachments';
import { combineFilterWithAuthorizationFilter } from '../authorization/utils';
import { SEVERITY_EXTERNAL_TO_ESMODEL, STATUS_EXTERNAL_TO_ESMODEL } from '../common/constants';
import {
  getIDsAndIndicesAsArrays,
  isCommentRequestTypeAlert,
  isCommentRequestTypeUser,
  isCommentRequestTypeActions,
  assertUnreachable,
} from '../common/utils';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type {
  AttachmentRequest,
  CasesFindRequestSortFields,
  CasesFindRequestSearchFields,
} from '../../common/types/api';
import type { ICasesCustomField } from '../custom_fields';
import { casesCustomFields } from '../custom_fields';

// TODO: I think we can remove most of this function since we're using a different excess
export const decodeCommentRequest = (
  comment: AttachmentRequest,
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry
) => {
  if (isCommentRequestTypeUser(comment)) {
    decodeWithExcessOrThrow(UserCommentAttachmentPayloadRt)(comment);
  } else if (isCommentRequestTypeActions(comment)) {
    decodeWithExcessOrThrow(ActionsAttachmentPayloadRt)(comment);
  } else if (isCommentRequestTypeAlert(comment)) {
    decodeWithExcessOrThrow(AlertAttachmentPayloadRt)(comment);

    const { ids, indices } = getIDsAndIndicesAsArrays(comment);

    /**
     * The alertId and index field must either be both of type string or they must both be string[] and be the same length.
     * Having a one-to-one relationship between the id and index of an alert avoids accidentally updating or
     * retrieving the wrong alert. Elasticsearch only guarantees that the _id (the field we use for alertId) to be
     * unique within a single index. So if we attempt to update or get a specific alert across multiple indices we could
     * update or receive the wrong one.
     *
     * Consider the situation where we have a alert1 with _id = '100' in index 'my-index-awesome' and also in index
     *  'my-index-hi'.
     * If we attempt to update the status of alert1 using an index pattern like `my-index-*` or even providing multiple
     * indices, there's a chance we'll accidentally update too many alerts.
     *
     * This check doesn't enforce that the API request has the correct alert ID to index relationship it just guards
     * against accidentally making a request like:
     * {
     *  alertId: [1,2,3],
     *  index: awesome,
     * }
     *
     * Instead this requires the requestor to provide:
     * {
     *  alertId: [1,2,3],
     *  index: [awesome, awesome, awesome]
     * }
     *
     * Ideally we'd change the format of the comment request to be an array of objects like:
     * {
     *  alerts: [{id: 1, index: awesome}, {id: 2, index: awesome}]
     * }
     *
     * But we'd need to also implement a migration because the saved object document currently stores the id and index
     * in separate fields.
     */
    if (ids.length !== indices.length) {
      throw badRequest(
        `Received an alert comment with ids and indices arrays of different lengths ids: ${JSON.stringify(
          ids
        )} indices: ${JSON.stringify(indices)}`
      );
    }
  } else if (isCommentRequestTypeExternalReference(comment)) {
    decodeExternalReferenceAttachment(comment, externalRefRegistry);
  } else if (isCommentRequestTypePersistableState(comment)) {
    decodeWithExcessOrThrow(PersistableStateAttachmentPayloadRt)(comment);
  } else {
    /**
     * This assertion ensures that TS will show an error
     * when we add a new attachment type. This way, we rely on TS
     * to remind us that we have to do a check for the new attachment.
     */
    assertUnreachable(comment);
  }
};

const decodeExternalReferenceAttachment = (
  attachment: ExternalReferenceAttachmentPayload,
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry
) => {
  if (attachment.externalReferenceStorage.type === ExternalReferenceStorageType.savedObject) {
    decodeWithExcessOrThrow(ExternalReferenceSOAttachmentPayloadRt)(attachment);
  } else {
    decodeWithExcessOrThrow(ExternalReferenceNoSOAttachmentPayloadRt)(attachment);
  }

  const metadata = attachment.externalReferenceMetadata;
  if (externalRefRegistry.has(attachment.externalReferenceAttachmentTypeId)) {
    const attachmentType = externalRefRegistry.get(attachment.externalReferenceAttachmentTypeId);

    attachmentType.schemaValidator?.(metadata);
  }
};

/**
 * Return the alert IDs from the comment if it is an alert style comment. Otherwise return an empty array.
 */
export const getAlertIds = (comment: AttachmentRequest): string[] => {
  if (isCommentRequestTypeAlert(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  }
  return [];
};

const addStatusFilter = (status: CaseStatuses | CaseStatuses[]): KueryNode | undefined => {
  if (Array.isArray(status)) {
    return buildFilter({
      filters: status.map((_status) => `${STATUS_EXTERNAL_TO_ESMODEL[_status]}`),
      field: 'status',
      operator: 'or',
    });
  }

  return nodeBuilder.is(
    `${CASE_SAVED_OBJECT}.attributes.status`,
    `${STATUS_EXTERNAL_TO_ESMODEL[status]}`
  );
};

const addSeverityFilter = (severity: CaseSeverity | CaseSeverity[]): KueryNode | undefined => {
  if (Array.isArray(severity)) {
    return buildFilter({
      filters: severity.map((_severity) => `${SEVERITY_EXTERNAL_TO_ESMODEL[_severity]}`),
      field: 'severity',
      operator: 'or',
    });
  }
  return nodeBuilder.is(
    `${CASE_SAVED_OBJECT}.attributes.severity`,
    `${SEVERITY_EXTERNAL_TO_ESMODEL[severity]}`
  );
};

const buildCategoryFilter = (categories: CasesSearchParams['category']): KueryNode | undefined => {
  if (categories === undefined) {
    return;
  }

  const categoriesAsArray = Array.isArray(categories) ? categories : [categories];

  if (categoriesAsArray.length === 0) {
    return;
  }

  const categoryFilters = categoriesAsArray.map((category) =>
    nodeBuilder.is(`${CASE_SAVED_OBJECT}.attributes.category`, `${category}`)
  );

  return nodeBuilder.or(categoryFilters);
};

export const NodeBuilderOperators = {
  and: 'and',
  or: 'or',
} as const;

type NodeBuilderOperatorsType = keyof typeof NodeBuilderOperators;

interface FilterField {
  filters?: string | string[];
  field: string;
  operator: NodeBuilderOperatorsType;
  type?: string;
}

export const buildFilter = ({
  filters,
  field,
  operator,
  type = CASE_SAVED_OBJECT,
}: FilterField): KueryNode | undefined => {
  if (filters === undefined) {
    return;
  }

  const filtersAsArray = Array.isArray(filters) ? filters : [filters];

  if (filtersAsArray.length === 0) {
    return;
  }

  return nodeBuilder[operator](
    filtersAsArray.map((filter) => nodeBuilder.is(`${type}.attributes.${field}`, filter))
  );
};

/**
 * Combines the authorized filters with the requested owners.
 */
export const combineAuthorizedAndOwnerFilter = (
  owner?: string[] | string,
  authorizationFilter?: KueryNode,
  savedObjectType?: string
): KueryNode | undefined => {
  const ownerFilter = buildFilter({
    filters: owner,
    field: OWNER_FIELD,
    operator: 'or',
    type: savedObjectType,
  });

  return combineFilterWithAuthorizationFilter(ownerFilter, authorizationFilter);
};

/**
 * Combines Kuery nodes and accepts an array with a mixture of undefined and KueryNodes. This will filter out the undefined
 * filters and return a KueryNode with the filters combined using the specified operator which defaults to and if not defined.
 */
export function combineFilters(
  nodes: Array<KueryNode | undefined>,
  operator: NodeBuilderOperatorsType = NodeBuilderOperators.and
): KueryNode | undefined {
  const filters = nodes.filter((node): node is KueryNode => node !== undefined);
  if (filters.length <= 0) {
    return;
  }
  return nodeBuilder[operator](filters);
}

/**
 * Creates a KueryNode from a string expression. Returns undefined if the expression is undefined.
 */
export function stringToKueryNode(expression?: string): KueryNode | undefined {
  if (!expression) {
    return;
  }

  return fromKueryExpression(expression);
}

export const buildRangeFilter = ({
  from,
  to,
  field = 'created_at',
  savedObjectType = CASE_SAVED_OBJECT,
}: {
  from?: string;
  to?: string;
  field?: string;
  savedObjectType?: string;
}): KueryNode | undefined => {
  if (from == null && to == null) {
    return;
  }

  try {
    const fromKQL =
      from != null
        ? `${escapeKuery(savedObjectType)}.attributes.${escapeKuery(field)} >= ${escapeKuery(from)}`
        : undefined;
    const toKQL =
      to != null
        ? `${escapeKuery(savedObjectType)}.attributes.${escapeKuery(field)} <= ${escapeKuery(to)}`
        : undefined;

    const rangeKQLQuery = `${fromKQL != null ? fromKQL : ''} ${
      fromKQL != null && toKQL != null ? 'and' : ''
    } ${toKQL != null ? toKQL : ''}`;

    return stringToKueryNode(rangeKQLQuery);
  } catch (error) {
    throw badRequest('Invalid "from" and/or "to" query parameters');
  }
};

export const buildAssigneesFilter = ({
  assignees,
}: {
  assignees: CasesSearchParams['assignees'];
}): KueryNode | undefined => {
  if (assignees === undefined) {
    return;
  }

  const assigneesAsArray = Array.isArray(assignees) ? assignees : [assignees];

  if (assigneesAsArray.length === 0) {
    return;
  }

  const assigneesWithoutNone = assigneesAsArray.filter(
    (assignee) => assignee !== NO_ASSIGNEES_FILTERING_KEYWORD
  );
  const hasNoneAssignee = assigneesAsArray.some(
    (assignee) => assignee === NO_ASSIGNEES_FILTERING_KEYWORD
  );

  const assigneesFilter = assigneesWithoutNone.map((filter) =>
    nodeBuilder.is(`${CASE_SAVED_OBJECT}.attributes.assignees.uid`, filter)
  );

  if (!hasNoneAssignee) {
    return nodeBuilder.or(assigneesFilter);
  }

  const filterCasesWithoutAssigneesKueryNode = fromKueryExpression(
    `not ${CASE_SAVED_OBJECT}.attributes.assignees.uid: *`
  );

  return nodeBuilder.or([...assigneesFilter, filterCasesWithoutAssigneesKueryNode]);
};

export const buildCustomFieldsFilter = ({
  customFields,
  customFieldsConfiguration,
}: {
  customFields: CasesSearchParams['customFields'];
  customFieldsConfiguration?: CustomFieldsConfiguration;
}): KueryNode | undefined => {
  if (!customFields || !customFieldsConfiguration?.length) {
    return;
  }

  const customFieldsMappings: Array<Record<string, ICasesCustomField>> = [];

  Object.keys(customFields).forEach((item: string) => {
    const customFieldConfig = customFieldsConfiguration.find((config) => config.key === item);

    if (!customFieldConfig) {
      return;
    }

    const mapping = casesCustomFields.get(customFieldConfig.type);

    if (!mapping) {
      return;
    }

    customFieldsMappings.push({ [item]: mapping });
  });

  if (!customFieldsMappings.length) {
    return;
  }

  const customFieldsFilter = Object.entries(customFields).map(([key, value]) => {
    const customFieldMapping = customFieldsMappings.find((mapping) => mapping[key]) ?? {};

    if (!Object.values(value).length) {
      return fromKueryExpression(`${CASE_SAVED_OBJECT}.attributes.customFields:{key: ${key}}`);
    }

    return nodeBuilder.or(
      Object.values(value).map((filterValue) => {
        if (filterValue === null) {
          return fromKueryExpression(
            `${CASE_SAVED_OBJECT}.attributes.customFields:{key: ${key} and (not value:*)}`
          );
        }

        return fromKueryExpression(
          `${CASE_SAVED_OBJECT}.attributes.customFields:{key: ${key} and value.${customFieldMapping[key].savedObjectMappingType}: ${filterValue}}`
        );
      })
    );
  });

  return nodeBuilder.and([...customFieldsFilter]);
};

export const constructQueryOptions = ({
  tags,
  reporters,
  status,
  severity,
  sortField,
  owner,
  authorizationFilter,
  from,
  to,
  assignees,
  category,
  customFields,
  customFieldsConfiguration,
  searchTerm,
  searchFields,
  spaceId,
  savedObjectsSerializer,
}: CasesSearchParams & {
  customFieldsConfiguration?: CustomFieldsConfiguration;
  searchTerm?: string;
  searchFields?: CasesFindRequestSearchFields[];
  spaceId?: string;
  savedObjectsSerializer?: ISavedObjectsSerializer;
}): SavedObjectFindOptionsKueryNode => {
  const tagsFilter = buildFilter({ filters: tags, field: 'tags', operator: 'or' });
  const reportersFilter = createReportersFilter(reporters);
  const sortByField = convertSortField(sortField);
  const ownerFilter = buildFilter({ filters: owner, field: OWNER_FIELD, operator: 'or' });
  const statusFilter = status != null ? addStatusFilter(status) : undefined;
  const severityFilter = severity != null ? addSeverityFilter(severity) : undefined;
  const rangeFilter = buildRangeFilter({ from, to });
  const assigneesFilter = buildAssigneesFilter({ assignees });
  const categoryFilter = buildCategoryFilter(category);
  const customFieldsFilter = buildCustomFieldsFilter({ customFields, customFieldsConfiguration });
  const searchFilter = buildSearchFilter({
    searchTerm,
    searchFields,
    spaceId,
    savedObjectsSerializer,
  });

  const filters = combineFilters([
    statusFilter,
    severityFilter,
    tagsFilter,
    reportersFilter,
    rangeFilter,
    ownerFilter,
    assigneesFilter,
    categoryFilter,
    customFieldsFilter,
    searchFilter,
  ]);

  return {
    filter: combineFilterWithAuthorizationFilter(filters, authorizationFilter),
    sortField: sortByField,
  };
};

const createReportersFilter = (reporters?: string | string[]): KueryNode | undefined => {
  const reportersFilter = buildFilter({
    filters: reporters,
    field: 'created_by.username',
    operator: 'or',
  });

  const reportersProfileUidFilter = buildFilter({
    filters: reporters,
    field: 'created_by.profile_uid',
    operator: 'or',
  });

  const filters = [reportersFilter, reportersProfileUidFilter].filter(
    (filter): filter is KueryNode => filter != null
  );

  if (filters.length <= 0) {
    return;
  }

  return nodeBuilder.or(filters);
};

interface CompareArrays<T> {
  addedItems: T[];
  deletedItems: T[];
}

export const arraysDifference = <T>(
  originalValue: T[] | undefined | null,
  updatedValue: T[] | undefined | null
): CompareArrays<T> | null => {
  if (
    originalValue != null &&
    updatedValue != null &&
    Array.isArray(updatedValue) &&
    Array.isArray(originalValue)
  ) {
    const addedItems = differenceWith(updatedValue, originalValue, isEqual);
    const deletedItems = differenceWith(originalValue, updatedValue, isEqual);

    if (addedItems.length > 0 || deletedItems.length > 0) {
      return {
        addedItems,
        deletedItems,
      };
    }
  }
  return null;
};

interface CaseWithIDVersion {
  id: string;
  version: string;

  [key: string]: unknown;
}

export const getCaseToUpdate = (
  currentCase: unknown,
  queryCase: CaseWithIDVersion
): CaseWithIDVersion =>
  Object.entries(queryCase).reduce<CaseWithIDVersion>(
    (acc, [key, value]) => {
      const currentValue = get(currentCase, key);
      if (Array.isArray(currentValue) && Array.isArray(value)) {
        if (arraysDifference(value, currentValue)) {
          acc[key] = value;
        }
      } else if (isPlainObject(currentValue) && isPlainObject(value)) {
        if (!deepEqual(currentValue, value)) {
          acc[key] = value;
        }
      } else if (currentValue !== undefined && value !== currentValue) {
        acc[key] = value;
      }
      return acc;
    },
    { id: queryCase.id, version: queryCase.version }
  );

/**
 * TODO: Backend is not connected with the
 * frontend in x-pack/plugins/cases/common/ui/types.ts.
 * It is easy to forget to update a sort field.
 * We should fix it and make it common.
 * Also the sortField in x-pack/plugins/cases/common/api/cases/case.ts
 * is set to string. We should narrow it to the
 * acceptable values
 */
enum SortFieldCase {
  closedAt = 'closed_at',
  createdAt = 'created_at',
  status = 'status',
  title = 'title.keyword',
  severity = 'severity',
  updatedAt = 'updated_at',
  category = 'category',
}

export const convertSortField = (
  sortField: CasesFindRequestSortFields | undefined
): SortFieldCase => {
  switch (sortField) {
    case 'status':
      return SortFieldCase.status;
    case 'createdAt':
      return SortFieldCase.createdAt;
    case 'closedAt':
      return SortFieldCase.closedAt;
    case 'title':
      return SortFieldCase.title;
    case 'severity':
      return SortFieldCase.severity;
    case 'updatedAt':
      return SortFieldCase.updatedAt;
    case 'category':
      return SortFieldCase.category;
    default:
      return SortFieldCase.createdAt;
  }
};

const buildSearchFilter = ({
  searchTerm,
  searchFields,
  spaceId,
  savedObjectsSerializer,
}: {
  searchTerm?: string;
  searchFields?: CasesFindRequestSearchFields[];
  spaceId?: string;
  savedObjectsSerializer?: ISavedObjectsSerializer;
}) => {
  if (!searchTerm || !searchFields) return;

  // search for title and description
  const searchFieldsFilters = searchFields.map((field) => {
    return fromKueryExpression(`${CASE_SAVED_OBJECT}.attributes.${field}:${searchTerm}`);
  });

  // search inside custom fields
  const searchCustomFieldsFilter = fromKueryExpression(
    `${CASE_SAVED_OBJECT}.attributes.customFields:{value.string:${searchTerm}}`
  );

  // search for _id field if the search term is a uuid
  let searchIdFilter: KueryNode[] = [];
  if (uuidValidate(searchTerm) && savedObjectsSerializer && spaceId) {
    const rawId = savedObjectsSerializer.generateRawId(
      spaceIdToNamespace(spaceId),
      CASE_SAVED_OBJECT,
      searchTerm
    );

    searchIdFilter = [fromKueryExpression(`${CASE_SAVED_OBJECT}.id: "${rawId}"`)];
  }

  return nodeBuilder.or([...searchFieldsFilters, searchCustomFieldsFilter, ...searchIdFilter]);
};
