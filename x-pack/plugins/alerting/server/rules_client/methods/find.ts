/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { pick } from 'lodash';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RawRule, RuleTypeParams, SanitizedRule, Rule } from '../../types';
import { AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  mapSortField,
  validateOperationOnAttributes,
  buildKueryNodeFilter,
  includeFieldsRequiredForAuthentication,
} from '../common';
import {
  getModifiedField,
  getModifiedSearchFields,
  getModifiedSearch,
  modifyFilterKueryNode,
} from '../common/mapped_params_utils';
import { alertingAuthorizationFilterOpts } from '../common/constants';
import { getAlertFromRaw } from '../lib/get_alert_from_raw';
import type { IndexType, RulesClientContext } from '../types';
import { buildAuthorizationOptions, formatLegacyActions } from '../lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export interface FindParams {
  options?: FindOptions;
  excludeFromPublicApi?: boolean;
  includeSnoozeData?: boolean;
  featuresIds?: string[];
}

export interface FindOptions extends IndexType {
  perPage?: number;
  page?: number;
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  hasReference?: {
    type: string;
    id: string;
  };
  fields?: string[];
  filter?: string | KueryNode;
  filterConsumers?: string[];
  ruleTypeIds?: string[];
}

export interface FindResult<Params extends RuleTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedRule<Params>>;
}

export async function find<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  {
    options: { fields, filterConsumers, ruleTypeIds, ...options } = {},
    excludeFromPublicApi = false,
    includeSnoozeData = false,
  }: FindParams = {}
): Promise<FindResult<Params>> {
  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts,
      buildAuthorizationOptions(filterConsumers, ruleTypeIds)
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND,
        error,
      })
    );
    throw error;
  }

  const { filter: authorizationFilter, ensureRuleTypeIsAuthorized } = authorizationTuple;
  const filterKueryNode = buildKueryNodeFilter(options.filter);
  let sortField = mapSortField(options.sortField);
  if (excludeFromPublicApi) {
    try {
      validateOperationOnAttributes(
        filterKueryNode,
        sortField,
        options.searchFields,
        context.fieldsToExcludeFromPublicApi
      );
    } catch (error) {
      throw Boom.badRequest(`Error find rules: ${error.message}`);
    }
  }

  sortField = mapSortField(getModifiedField(options.sortField));

  // Generate new modified search and search fields, translating certain params properties
  // to mapped_params. Thus, allowing for sort/search/filtering on params.
  // We do the modifcation after the validate check to make sure the public API does not
  // use the mapped_params in their queries.
  options = {
    ...options,
    ...(options.searchFields && { searchFields: getModifiedSearchFields(options.searchFields) }),
    ...(options.search && { search: getModifiedSearch(options.searchFields, options.search) }),
  };

  // Modifies kuery node AST to translate params filter and the filter value to mapped_params.
  // This translation is done in place, and therefore is not a pure function.
  if (filterKueryNode) {
    modifyFilterKueryNode({ astFilter: filterKueryNode });
  }

  const {
    page,
    per_page: perPage,
    total,
    saved_objects: data,
  } = await context.unsecuredSavedObjectsClient.find<RawRule>({
    ...options,
    sortField,
    filter:
      (authorizationFilter && filterKueryNode
        ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
        : authorizationFilter) ?? filterKueryNode,
    fields: fields ? includeFieldsRequiredForAuthentication(fields) : fields,
    type: RULE_SAVED_OBJECT_TYPE,
  });

  const siemRules: Rule[] = [];

  const authorizedData = data.map(({ id, attributes, references }) => {
    try {
      ensureRuleTypeIsAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        AlertingAuthorizationEntity.Rule
      );
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FIND,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
          error,
        })
      );
      throw error;
    }

    const rule = getAlertFromRaw<Params>(
      context,
      id,
      attributes.alertTypeId,
      fields ? (pick(attributes, fields) as RawRule) : attributes,
      references,
      false,
      excludeFromPublicApi,
      includeSnoozeData
    );

    // collect SIEM rule for further formatting legacy actions
    if (attributes.consumer === AlertConsumers.SIEM) {
      siemRules.push(rule);
    }

    return rule;
  });

  authorizedData.forEach(({ id }) =>
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
      })
    )
  );

  // format legacy actions for SIEM rules, if there any
  if (siemRules.length) {
    const formattedRules = await formatLegacyActions(siemRules, {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    const formattedRulesMap = formattedRules.reduce<Record<string, Rule>>((acc, rule) => {
      acc[rule.id] = rule;
      return acc;
    }, {});

    return {
      page,
      perPage,
      total,
      // replace siem formatted rules
      data: authorizedData.map((rule) => formattedRulesMap[rule.id] ?? rule),
    };
  }

  return {
    page,
    perPage,
    total,
    data: authorizedData,
  };
}
