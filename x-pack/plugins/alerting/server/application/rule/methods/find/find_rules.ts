/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEmpty, pick } from 'lodash';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { SanitizedRule, Rule as DeprecatedRule, RawRule } from '../../../../types';
import { AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  mapSortField,
  validateOperationOnAttributes,
  buildKueryNodeFilter,
  includeFieldsRequiredForAuthentication,
} from '../../../../rules_client/common';
import {
  getModifiedField,
  getModifiedSearchFields,
  getModifiedSearch,
  modifyFilterKueryNode,
} from '../../../../rules_client/common/mapped_params_utils';
import { alertingAuthorizationFilterOpts } from '../../../../rules_client/common/constants';
import type { RulesClientContext } from '../../../../rules_client/types';
import { formatLegacyActions, getAlertFromRaw } from '../../../../rules_client/lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { FindRulesParams } from './types';
import { findRulesParamsSchema } from './schemas';
import { Rule, RuleParams } from '../../types';
import { findRulesSo } from '../../../../data/rule';

export interface FindResult<Params extends RuleParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedRule<Params>>;
}

export async function findRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params?: FindRulesParams
): Promise<FindResult<Params>> {
  const { options, excludeFromPublicApi = false, includeSnoozeData = false } = params || {};

  const { fields, filterConsumers, ...restOptions } = options || {};

  try {
    if (params) {
      findRulesParamsSchema.validate(params);
    }
  } catch (error) {
    throw Boom.badRequest(`Error validating find data - ${error.message}`);
  }

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts,
      isEmpty(filterConsumers) ? undefined : new Set(filterConsumers)
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
  const filterKueryNode = buildKueryNodeFilter(restOptions.filter as string | KueryNode);
  let sortField = mapSortField(restOptions.sortField);
  if (excludeFromPublicApi) {
    try {
      validateOperationOnAttributes(
        filterKueryNode,
        sortField,
        restOptions.searchFields,
        context.fieldsToExcludeFromPublicApi
      );
    } catch (error) {
      throw Boom.badRequest(`Error find rules: ${error.message}`);
    }
  }

  sortField = mapSortField(getModifiedField(restOptions.sortField));

  // Generate new modified search and search fields, translating certain params properties
  // to mapped_params. Thus, allowing for sort/search/filtering on params.
  // We do the modifcation after the validate check to make sure the public API does not
  // use the mapped_params in their queries.
  const modifiedOptions = {
    ...restOptions,
    ...(restOptions.searchFields && {
      searchFields: getModifiedSearchFields(restOptions.searchFields),
    }),
    ...(restOptions.search && {
      search: getModifiedSearch(restOptions.searchFields, restOptions.search),
    }),
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
  } = await findRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      ...modifiedOptions,
      sortField,
      filter:
        (authorizationFilter && filterKueryNode
          ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
          : authorizationFilter) ?? filterKueryNode,
      fields: fields ? includeFieldsRequiredForAuthentication(fields) : fields,
    },
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
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
          error,
        })
      );
      throw error;
    }

    const rule = getAlertFromRaw<Params>({
      excludeFromPublicApi,
      id,
      includeLegacyId: false,
      includeSnoozeData,
      isSystemAction: context.isSystemAction,
      logger: context.logger,
      rawRule: (fields ? pick(attributes, fields) : attributes) as RawRule,
      references,
      ruleTypeId: attributes.alertTypeId,
      ruleTypeRegistry: context.ruleTypeRegistry,
    });

    // collect SIEM rule for further formatting legacy actions
    if (attributes.consumer === AlertConsumers.SIEM) {
      siemRules.push(rule as Rule);
    }

    return rule;
  });

  authorizedData.forEach(({ id, name }) =>
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      })
    )
  );

  // format legacy actions for SIEM rules, if there any
  if (siemRules.length) {
    const formattedRules = await formatLegacyActions(siemRules as DeprecatedRule[], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    const formattedRulesMap = formattedRules.reduce<Record<string, DeprecatedRule>>((acc, rule) => {
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
    data: authorizedData as Array<SanitizedRule<Params>>,
  };
}
