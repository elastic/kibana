/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObject, SavedObjectsFindOptionsReference } from '@kbn/core/server';
import { buildKueryNodeFilter } from '../../../../rules_client/common';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { RulesClientContext } from '../../../../rules_client';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../../../authorization';
import {
  adHocRunAuditEvent,
  AdHocRunAuditAction,
} from '../../../../rules_client/common/audit_events';
import type { FindBackfillParams, FindBackfillResult } from './types';
import { findBackfillQuerySchema } from './schemas';
import { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { transformAdHocRunToBackfillResult } from '../../transforms';
import { Backfill } from '../../result/types';

export async function findBackfill(
  context: RulesClientContext,
  params: FindBackfillParams
): Promise<FindBackfillResult> {
  try {
    try {
      findBackfillQuerySchema.validate(params);
    } catch (error) {
      throw new Error(
        `Could not validate find parameters "${JSON.stringify(params)}" - ${error.message}`
      );
    }

    let authorizationTuple;
    try {
      authorizationTuple = await context.authorization.getFindAuthorizationFilter({
        authorizationEntity: AlertingAuthorizationEntity.Rule,
        filterOpts: {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
            consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          },
        },
      });
    } catch (error) {
      context.auditLogger?.log(
        adHocRunAuditEvent({
          action: AdHocRunAuditAction.FIND,
          error,
        })
      );
      throw error;
    }

    // Build options based on params
    const hasReferenceArray: SavedObjectsFindOptionsReference[] = [];
    if (params.ruleIds) {
      const ruleIds = params.ruleIds.split(',');
      (ruleIds ?? []).forEach((ruleId: string) => {
        hasReferenceArray.push({ id: ruleId, type: RULE_SAVED_OBJECT_TYPE });
      });
    }

    const timeFilters: string[] = [];
    if (params.start) {
      timeFilters.push(`ad_hoc_run_params.attributes.start >= "${params.start}"`);
    }
    if (params.end) {
      timeFilters.push(`ad_hoc_run_params.attributes.end <= "${params.end}"`);
    }
    const timeFilter = timeFilters.length > 0 ? timeFilters.join(` AND `) : undefined;
    const filterKueryNode = buildKueryNodeFilter(timeFilter);

    const { filter: authorizationFilter } = authorizationTuple;
    const {
      page,
      per_page: perPage,
      total,
      saved_objects: data,
    } = await context.unsecuredSavedObjectsClient.find<AdHocRunSO>({
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
      page: params.page,
      perPage: params.perPage,
      filter:
        (authorizationFilter && filterKueryNode
          ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
          : authorizationFilter) ?? filterKueryNode,
      ...(hasReferenceArray.length > 0 ? { hasReference: hasReferenceArray } : {}),
      ...(params.sortField ? { sortField: params.sortField } : {}),
      ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
    });

    const transformedData: Backfill[] = data.map((so: SavedObject<AdHocRunSO>) => {
      context.auditLogger?.log(
        adHocRunAuditEvent({
          action: AdHocRunAuditAction.FIND,
          savedObject: {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id: so.id,
            name: `backfill for rule "${so.attributes.rule.name}"`,
          },
        })
      );

      return transformAdHocRunToBackfillResult(so) as Backfill;
    });

    return {
      page,
      perPage,
      total,
      data: transformedData,
    };
  } catch (err) {
    const errorMessage = `Failed to find backfills`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
